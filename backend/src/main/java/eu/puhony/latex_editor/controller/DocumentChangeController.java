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
                request.getBranchId(),
                user
        );

        // Broadcast changes to all subscribers
        ChangesBatchResponse response = new ChangesBatchResponse();
        response.setFileId(fileId);
        response.setSessionId(request.getSessionId());
        response.setUserId(user.getId());
        response.setUserName(user.getName() != null ? user.getName() : user.getEmail());
        response.setBranchId(request.getBranchId());
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

    @MessageMapping("/document/{fileId}/cursor")
    public void handleCursorUpdate(@DestinationVariable String fileId,
                                   @Payload CursorUpdateRequest request,
                                   Principal principal) {
        UserDetails userDetails = (UserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        CursorUpdateResponse response = new CursorUpdateResponse();
        response.setFileId(fileId);
        response.setSessionId(request.getSessionId());
        response.setUserId(user.getId());
        response.setUserName(user.getName() != null ? user.getName() : user.getEmail());
        response.setBranchId(request.getBranchId());
        response.setLine(request.getLine());
        response.setColumn(request.getColumn());
        response.setSelectionStartLine(request.getSelectionStartLine());
        response.setSelectionStartColumn(request.getSelectionStartColumn());
        response.setSelectionEndLine(request.getSelectionEndLine());
        response.setSelectionEndColumn(request.getSelectionEndColumn());

        messagingTemplate.convertAndSend("/topic/document/" + fileId + "/cursors", response);
    }

    @MessageMapping("/document/{fileId}/cursor/leave")
    public void handleCursorLeave(@DestinationVariable String fileId,
                                  @Payload CursorLeaveRequest request,
                                  Principal principal) {
        UserDetails userDetails = (UserDetails) ((org.springframework.security.authentication.UsernamePasswordAuthenticationToken) principal).getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        CursorLeaveResponse response = new CursorLeaveResponse();
        response.setFileId(fileId);
        response.setSessionId(request.getSessionId());
        response.setUserId(user.getId());

        messagingTemplate.convertAndSend("/topic/document/" + fileId + "/cursors/leave", response);
    }

    // DTOs
    public static class ChangesBatchRequest {
        private String sessionId;
        private Long baseChangeId;
        private Long branchId;
        private List<DocumentChangeService.ChangeData> changes;

        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
        public Long getBaseChangeId() { return baseChangeId; }
        public void setBaseChangeId(Long baseChangeId) { this.baseChangeId = baseChangeId; }
        public Long getBranchId() { return branchId; }
        public void setBranchId(Long branchId) { this.branchId = branchId; }
        public List<DocumentChangeService.ChangeData> getChanges() { return changes; }
        public void setChanges(List<DocumentChangeService.ChangeData> changes) { this.changes = changes; }
    }

    public static class ChangesBatchResponse {
        private String fileId;
        private String sessionId;
        private Long userId;
        private String userName;
        private Long branchId;
        private List<ChangeResponse> changes;
        private Integer chunkIndex;
        private Integer totalChunks;

        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getUserName() { return userName; }
        public void setUserName(String userName) { this.userName = userName; }
        public Long getBranchId() { return branchId; }
        public void setBranchId(Long branchId) { this.branchId = branchId; }
        public List<ChangeResponse> getChanges() { return changes; }
        public void setChanges(List<ChangeResponse> changes) { this.changes = changes; }
        public Integer getChunkIndex() { return chunkIndex; }
        public void setChunkIndex(Integer chunkIndex) { this.chunkIndex = chunkIndex; }
        public Integer getTotalChunks() { return totalChunks; }
        public void setTotalChunks(Integer totalChunks) { this.totalChunks = totalChunks; }
    }

    public static class ChangeResponse {
        private Long id;
        private String operation;
        private Integer line;
        private String content;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
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

    // Cursor DTOs
    public static class CursorUpdateRequest {
        private String sessionId;
        private Long branchId;
        private Integer line;
        private Integer column;
        private Integer selectionStartLine;
        private Integer selectionStartColumn;
        private Integer selectionEndLine;
        private Integer selectionEndColumn;

        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
        public Long getBranchId() { return branchId; }
        public void setBranchId(Long branchId) { this.branchId = branchId; }
        public Integer getLine() { return line; }
        public void setLine(Integer line) { this.line = line; }
        public Integer getColumn() { return column; }
        public void setColumn(Integer column) { this.column = column; }
        public Integer getSelectionStartLine() { return selectionStartLine; }
        public void setSelectionStartLine(Integer selectionStartLine) { this.selectionStartLine = selectionStartLine; }
        public Integer getSelectionStartColumn() { return selectionStartColumn; }
        public void setSelectionStartColumn(Integer selectionStartColumn) { this.selectionStartColumn = selectionStartColumn; }
        public Integer getSelectionEndLine() { return selectionEndLine; }
        public void setSelectionEndLine(Integer selectionEndLine) { this.selectionEndLine = selectionEndLine; }
        public Integer getSelectionEndColumn() { return selectionEndColumn; }
        public void setSelectionEndColumn(Integer selectionEndColumn) { this.selectionEndColumn = selectionEndColumn; }
    }

    public static class CursorUpdateResponse {
        private String fileId;
        private String sessionId;
        private Long userId;
        private String userName;
        private Long branchId;
        private Integer line;
        private Integer column;
        private Integer selectionStartLine;
        private Integer selectionStartColumn;
        private Integer selectionEndLine;
        private Integer selectionEndColumn;

        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getUserName() { return userName; }
        public void setUserName(String userName) { this.userName = userName; }
        public Long getBranchId() { return branchId; }
        public void setBranchId(Long branchId) { this.branchId = branchId; }
        public Integer getLine() { return line; }
        public void setLine(Integer line) { this.line = line; }
        public Integer getColumn() { return column; }
        public void setColumn(Integer column) { this.column = column; }
        public Integer getSelectionStartLine() { return selectionStartLine; }
        public void setSelectionStartLine(Integer selectionStartLine) { this.selectionStartLine = selectionStartLine; }
        public Integer getSelectionStartColumn() { return selectionStartColumn; }
        public void setSelectionStartColumn(Integer selectionStartColumn) { this.selectionStartColumn = selectionStartColumn; }
        public Integer getSelectionEndLine() { return selectionEndLine; }
        public void setSelectionEndLine(Integer selectionEndLine) { this.selectionEndLine = selectionEndLine; }
        public Integer getSelectionEndColumn() { return selectionEndColumn; }
        public void setSelectionEndColumn(Integer selectionEndColumn) { this.selectionEndColumn = selectionEndColumn; }
    }

    public static class CursorLeaveRequest {
        private String sessionId;

        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    }

    public static class CursorLeaveResponse {
        private String fileId;
        private String sessionId;
        private Long userId;

        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
    }
}
