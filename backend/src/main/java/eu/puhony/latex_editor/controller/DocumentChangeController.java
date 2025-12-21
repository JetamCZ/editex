package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.DocumentChangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class DocumentChangeController {

    private final DocumentChangeService changeService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @MessageMapping("/document/{fileId}/changes")
    public void handleChanges(@DestinationVariable String fileId,
                              @Payload ChangesBatchRequest request,
                              Principal principal) {
        // Get the user from the principal
        UserDetails userDetails = (UserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<DocumentChange> savedChanges = changeService.saveChanges(
                fileId,
                request.getSessionId(),
                request.getChanges(),
                request.getBaseChangeId(),
                user
        );

        // Broadcast changes to all subscribers except the sender
        ChangesBatchResponse response = new ChangesBatchResponse();
        response.setFileId(fileId);
        response.setSessionId(request.getSessionId());
        response.setUserId(user.getId());
        response.setUserName(user.getName() != null ? user.getName() : user.getEmail());
        response.setChanges(savedChanges.stream()
                .map(change -> {
                    ChangeResponse changeResp = new ChangeResponse();
                    changeResp.setId(change.getId());
                    changeResp.setOperation(change.getOperation());
                    changeResp.setLine(change.getLineNumber());
                    changeResp.setContent(change.getContent());
                    return changeResp;
                })
                .collect(Collectors.toList()));

        messagingTemplate.convertAndSend("/topic/document/" + fileId, response);
    }

    // DTOs
    public static class ChangesBatchRequest {
        private String sessionId;
        private String baseChangeId;
        private List<DocumentChangeService.ChangeData> changes;

        public String getSessionId() {
            return sessionId;
        }

        public void setSessionId(String sessionId) {
            this.sessionId = sessionId;
        }

        public String getBaseChangeId() {
            return baseChangeId;
        }

        public void setBaseChangeId(String baseChangeId) {
            this.baseChangeId = baseChangeId;
        }

        public List<DocumentChangeService.ChangeData> getChanges() {
            return changes;
        }

        public void setChanges(List<DocumentChangeService.ChangeData> changes) {
            this.changes = changes;
        }
    }

    public static class ChangesBatchResponse {
        private String fileId;
        private String sessionId;
        private Long userId;
        private String userName;
        private List<ChangeResponse> changes;

        public String getFileId() {
            return fileId;
        }

        public void setFileId(String fileId) {
            this.fileId = fileId;
        }

        public String getSessionId() {
            return sessionId;
        }

        public void setSessionId(String sessionId) {
            this.sessionId = sessionId;
        }

        public Long getUserId() {
            return userId;
        }

        public void setUserId(Long userId) {
            this.userId = userId;
        }

        public String getUserName() {
            return userName;
        }

        public void setUserName(String userName) {
            this.userName = userName;
        }

        public List<ChangeResponse> getChanges() {
            return changes;
        }

        public void setChanges(List<ChangeResponse> changes) {
            this.changes = changes;
        }
    }

    public static class ChangeResponse {
        private String id;
        private String operation;
        private Integer line;
        private String content;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getOperation() {
            return operation;
        }

        public void setOperation(String operation) {
            this.operation = operation;
        }

        public Integer getLine() {
            return line;
        }

        public void setLine(Integer line) {
            this.line = line;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}
