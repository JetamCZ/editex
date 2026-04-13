package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.FileUploadResponse;
import eu.puhony.latex_editor.dto.MoveFileRequest;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.FileBranch;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import jakarta.validation.Valid;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.DocumentChangeService;
import eu.puhony.latex_editor.service.FileBranchService;
import eu.puhony.latex_editor.service.FileService;
import eu.puhony.latex_editor.service.MinioService;
import eu.puhony.latex_editor.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileService fileService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentChangeService documentChangeService;

    @Autowired
    private MinioService minioService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private FileBranchService fileBranchService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("baseProject") String baseProject,
            @RequestParam(value = "branch", defaultValue = "main") String branch,
            @RequestParam(value = "folder", defaultValue = "/") String folder,
            Authentication authentication) {

        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Project project = projectService.getProjectByBaseProjectAndBranch(baseProject, branch, user.getId())
                    .orElseThrow(() -> new RuntimeException("Project not found"));

            ProjectFile uploadedFile = fileService.uploadFile(file, project, folder, user);

            FileUploadResponse response = mapToResponse(uploadedFile);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            throw new RuntimeException("Error uploading file: " + e.getMessage(), e);
        }
    }

    @GetMapping("/project/{baseProject}/{branch}")
    public ResponseEntity<List<FileUploadResponse>> getProjectFiles(
            @PathVariable String baseProject,
            @PathVariable String branch,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectService.getProjectByBaseProjectAndBranch(baseProject, branch, user.getId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        List<ProjectFile> files = fileService.getProjectFiles(project.getId(), baseProject, user.getId());
        List<FileUploadResponse> response = files.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{baseProject}/{branch}/folder")
    public ResponseEntity<List<FileUploadResponse>> getProjectFilesByFolder(
            @PathVariable String baseProject,
            @PathVariable String branch,
            @RequestParam String folder,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectService.getProjectByBaseProjectAndBranch(baseProject, branch, user.getId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        List<ProjectFile> files = fileService.getProjectFilesByFolder(project.getId(), baseProject, folder, user.getId());
        List<FileUploadResponse> response = files.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<FileUploadResponse> getFileById(
            @PathVariable String fileId,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return fileService.getFileById(fileId, user.getId())
                .map(this::mapToResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{fileId}/content")
    public ResponseEntity<FileContentResponse> getFileContent(
            @PathVariable String fileId,
            @RequestParam(value = "branchId", required = false) String branchId,
            Authentication authentication) {

        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return fileService.getFileById(fileId, user.getId())
                .map(file -> {
                    try {
                        // Resolve which branch to use
                        String resolvedBranchId = branchId;
                        if (resolvedBranchId == null && file.getActiveBranch() != null) {
                            resolvedBranchId = file.getActiveBranch().getId();
                        }

                        String currentContent;
                        Long lastChangeId;

                        if (resolvedBranchId != null) {
                            // Branch-aware content resolution
                            currentContent = fileBranchService.getContent(resolvedBranchId, user.getId());
                            lastChangeId = documentChangeService.getLatestChange(file.getId(), resolvedBranchId, user.getId())
                                    .map(DocumentChange::getId)
                                    .orElse(null);
                        } else {
                            // Legacy fallback: S3 + all changes
                            String originalContent = minioService.getFileContent(file.getS3Url());
                            List<DocumentChange> changes = documentChangeService.getFileChanges(file.getId(), user.getId());
                            currentContent = documentChangeService.applyChangesToContent(originalContent, changes);
                            lastChangeId = documentChangeService.getLatestChange(file.getId(), user.getId())
                                    .map(DocumentChange::getId)
                                    .orElse(null);
                        }

                        FileContentResponse response = new FileContentResponse();
                        response.setContent(currentContent);
                        response.setLastChangeId(lastChangeId);
                        response.setFileType(file.getFileType());
                        response.setFileName(file.getOriginalFileName());
                        response.setActiveBranchId(file.getActiveBranch() != null ? file.getActiveBranch().getId() : null);
                        response.setActiveBranchName(file.getActiveBranch() != null ? file.getActiveBranch().getName() : null);

                        return ResponseEntity.ok(response);
                    } catch (Exception e) {
                        e.printStackTrace();
                        throw new RuntimeException("Error fetching file content", e);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private static final int WS_CHUNK_SIZE = 100;

    @PostMapping("/{fileId}/changes")
    public ResponseEntity<ChangesBatchResponse> postChanges(
            @PathVariable String fileId,
            @RequestBody ChangesBatchRequest request,
            Authentication authentication) {

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<DocumentChange> savedChanges = documentChangeService.saveChanges(
                fileId,
                request.getSessionId(),
                request.getChanges(),
                request.getBaseChangeId(),
                request.getBranchId(),
                user
        );

        // Convert to response format
        List<ChangeResponse> changeResponses = savedChanges.stream()
                .map(change -> {
                    ChangeResponse changeResp = new ChangeResponse();
                    changeResp.setId(change.getId());
                    changeResp.setOperation(change.getOperation());
                    changeResp.setLine(change.getLineNumber());
                    changeResp.setContent(change.getContent());
                    return changeResp;
                })
                .collect(Collectors.toList());

        // Broadcast to WebSocket subscribers in chunks if needed
        int totalChanges = changeResponses.size();
        int totalChunks = (int) Math.ceil((double) totalChanges / WS_CHUNK_SIZE);

        for (int i = 0; i < totalChunks; i++) {
            int fromIndex = i * WS_CHUNK_SIZE;
            int toIndex = Math.min(fromIndex + WS_CHUNK_SIZE, totalChanges);
            List<ChangeResponse> chunk = changeResponses.subList(fromIndex, toIndex);

            ChangesBatchResponse wsResponse = new ChangesBatchResponse();
            wsResponse.setFileId(fileId);
            wsResponse.setSessionId(request.getSessionId());
            wsResponse.setUserId(user.getId());
            wsResponse.setUserName(user.getName() != null ? user.getName() : user.getEmail());
            wsResponse.setBranchId(request.getBranchId());
            wsResponse.setChanges(chunk);
            wsResponse.setChunkIndex(i);
            wsResponse.setTotalChunks(totalChunks);

            messagingTemplate.convertAndSend("/topic/document/" + fileId, wsResponse);
        }

        // Build full response for HTTP
        ChangesBatchResponse response = new ChangesBatchResponse();
        response.setFileId(fileId);
        response.setSessionId(request.getSessionId());
        response.setUserId(user.getId());
        response.setUserName(user.getName() != null ? user.getName() : user.getEmail());
        response.setBranchId(request.getBranchId());
        response.setChanges(changeResponses);
        response.setChunkIndex(0);
        response.setTotalChunks(1);

        return ResponseEntity.ok(response);
    }

    // DTOs for changes endpoint
    public static class ChangesBatchRequest {
        private String sessionId;
        private Long baseChangeId;
        private String branchId;
        private List<DocumentChangeService.ChangeData> changes;

        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
        public Long getBaseChangeId() { return baseChangeId; }
        public void setBaseChangeId(Long baseChangeId) { this.baseChangeId = baseChangeId; }
        public String getBranchId() { return branchId; }
        public void setBranchId(String branchId) { this.branchId = branchId; }
        public List<DocumentChangeService.ChangeData> getChanges() { return changes; }
        public void setChanges(List<DocumentChangeService.ChangeData> changes) { this.changes = changes; }
    }

    public static class ChangesBatchResponse {
        private String fileId;
        private String sessionId;
        private Long userId;
        private String userName;
        private String branchId;
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
        public String getBranchId() { return branchId; }
        public void setBranchId(String branchId) { this.branchId = branchId; }
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

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getOperation() { return operation; }
        public void setOperation(String operation) { this.operation = operation; }
        public Integer getLine() { return line; }
        public void setLine(Integer line) { this.line = line; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }

    // DTO for file content response
    public static class FileContentResponse {
        private String content;
        private Long lastChangeId;
        private String fileType;
        private String fileName;
        private String activeBranchId;
        private String activeBranchName;

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public Long getLastChangeId() { return lastChangeId; }
        public void setLastChangeId(Long lastChangeId) { this.lastChangeId = lastChangeId; }
        public String getFileType() { return fileType; }
        public void setFileType(String fileType) { this.fileType = fileType; }
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getActiveBranchId() { return activeBranchId; }
        public void setActiveBranchId(String activeBranchId) { this.activeBranchId = activeBranchId; }
        public String getActiveBranchName() { return activeBranchName; }
        public void setActiveBranchName(String activeBranchName) { this.activeBranchName = activeBranchName; }
    }

    @PatchMapping("/{fileId}/move")
    public ResponseEntity<FileUploadResponse> moveFile(
            @PathVariable String fileId,
            @Valid @RequestBody MoveFileRequest request,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        ProjectFile movedFile = fileService.moveFile(fileId, request.getTargetFolder(), user.getId());
        return ResponseEntity.ok(mapToResponse(movedFile));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> deleteFile(
            @PathVariable String fileId,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean deleted = fileService.deleteFile(fileId, user.getId());
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    private FileUploadResponse mapToResponse(ProjectFile file) {
        User currentUser = userRepository.findByEmail(
                SecurityContextHolder.getContext().getAuthentication().getName()
        ).orElse(null);

        Long lastChangeId = null;
        if (currentUser != null) {
            lastChangeId = documentChangeService.getLatestChange(file.getId(), currentUser.getId())
                    .map(eu.puhony.latex_editor.entity.DocumentChange::getId)
                    .orElse(null);
        }

        String activeBranchId = file.getActiveBranch() != null ? file.getActiveBranch().getId() : null;
        String activeBranchName = file.getActiveBranch() != null ? file.getActiveBranch().getName() : null;

        return new FileUploadResponse(
                file.getId(),
                file.getProject().getBaseProject(),
                file.getProjectFolder(),
                file.getFileName(),
                file.getOriginalFileName(),
                file.getFileSize(),
                file.getFileType(),
                file.getS3Url(),
                file.getUploadedBy().getId(),
                file.getCreatedAt(),
                lastChangeId,
                activeBranchId,
                activeBranchName
        );
    }
}
