package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.entity.FileBranch;
import eu.puhony.latex_editor.entity.FileCommit;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.FileBranchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FileBranchController {

    private final FileBranchService branchService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // === Branch CRUD ===

    @GetMapping("/files/{fileId}/branches")
    public ResponseEntity<List<BranchResponse>> listBranches(
            @PathVariable String fileId,
            Authentication authentication) {
        User user = getUser(authentication);
        List<FileBranch> branches = branchService.listBranches(fileId, user.getId());

        List<BranchResponse> response = branches.stream()
                .map(this::mapBranchResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/files/{fileId}/branches")
    public ResponseEntity<BranchResponse> createBranch(
            @PathVariable String fileId,
            @RequestBody CreateBranchRequest request,
            Authentication authentication) {
        User user = getUser(authentication);

        FileBranch branch = branchService.createBranch(
                fileId, request.getName(), request.getSourceBranch(), user);

        return ResponseEntity.status(HttpStatus.CREATED).body(mapBranchResponse(branch));
    }

    @DeleteMapping("/files/{fileId}/branches/{branchId}")
    public ResponseEntity<Void> deleteBranch(
            @PathVariable String fileId,
            @PathVariable String branchId,
            Authentication authentication) {
        User user = getUser(authentication);
        branchService.deleteBranch(branchId, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/files/{fileId}/active-branch")
    public ResponseEntity<Void> setActiveBranch(
            @PathVariable String fileId,
            @RequestBody SetActiveBranchRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        branchService.setActiveBranch(fileId, request.getBranchId(), user.getId());

        // Broadcast branch change via WebSocket
        BranchChangeEvent event = new BranchChangeEvent();
        event.setFileId(fileId);
        event.setNewActiveBranchId(request.getBranchId());
        event.setChangedBy(user.getId());
        messagingTemplate.convertAndSend("/topic/document/" + fileId + "/branch-change", event);

        // Also send reload signal
        messagingTemplate.convertAndSend("/topic/document/" + fileId + "/reload", "branch-changed");

        return ResponseEntity.ok().build();
    }

    // === Content ===

    @GetMapping("/branches/{branchId}/content")
    public ResponseEntity<BranchContentResponse> getBranchContent(
            @PathVariable String branchId,
            Authentication authentication) {
        User user = getUser(authentication);
        String content = branchService.getContent(branchId, user.getId());

        BranchContentResponse response = new BranchContentResponse();
        response.setContent(content);

        return ResponseEntity.ok(response);
    }

    // === Commits ===

    @PostMapping("/branches/{branchId}/commits")
    public ResponseEntity<CommitResponse> createCommit(
            @PathVariable String branchId,
            @RequestBody(required = false) CreateCommitRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        String message = request != null ? request.getMessage() : null;

        FileCommit commit = branchService.commit(branchId, message, user);

        return ResponseEntity.status(HttpStatus.CREATED).body(mapCommitResponse(commit));
    }

    @GetMapping("/branches/{branchId}/commits")
    public ResponseEntity<List<CommitResponse>> listCommits(
            @PathVariable String branchId,
            Authentication authentication) {
        User user = getUser(authentication);
        List<FileCommit> commits = branchService.getCommitHistory(branchId, user.getId());

        List<CommitResponse> response = commits.stream()
                .map(this::mapCommitResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // === Merge & Diff ===

    @PostMapping("/branches/{branchId}/merge")
    public ResponseEntity<CommitResponse> mergeBranch(
            @PathVariable String branchId,
            @RequestBody MergeRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        FileCommit mergeCommit = branchService.merge(branchId, request.getTargetBranchId(), user);

        return ResponseEntity.ok(mapCommitResponse(mergeCommit));
    }

    @GetMapping("/branches/{sourceBranchId}/diff/{targetBranchId}")
    public ResponseEntity<DiffResponse> getDiff(
            @PathVariable String sourceBranchId,
            @PathVariable String targetBranchId,
            Authentication authentication) {
        User user = getUser(authentication);
        String[] contents = branchService.getDiff(sourceBranchId, targetBranchId, user.getId());

        DiffResponse response = new DiffResponse();
        response.setSourceContent(contents[0]);
        response.setTargetContent(contents[1]);

        return ResponseEntity.ok(response);
    }

    // === Helpers ===

    private User getUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private BranchResponse mapBranchResponse(FileBranch branch) {
        BranchResponse resp = new BranchResponse();
        resp.setId(branch.getId());
        resp.setFileId(branch.getFile().getId());
        resp.setName(branch.getName());
        resp.setSourceBranchName(branch.getSourceBranch() != null ? branch.getSourceBranch().getName() : null);
        resp.setCreatedBy(branch.getCreatedBy().getId());
        resp.setCreatedAt(branch.getCreatedAt());
        return resp;
    }

    private CommitResponse mapCommitResponse(FileCommit commit) {
        CommitResponse resp = new CommitResponse();
        resp.setId(commit.getId());
        resp.setHash(commit.getHash());
        resp.setBranchId(commit.getBranch().getId());
        resp.setMessage(commit.getMessage());
        resp.setCommittedBy(commit.getCommittedBy().getId());
        resp.setCommittedByName(commit.getCommittedBy().getName() != null
                ? commit.getCommittedBy().getName() : commit.getCommittedBy().getEmail());
        resp.setCreatedAt(commit.getCreatedAt());
        return resp;
    }

    // === DTOs ===

    public static class BranchResponse {
        private String id;
        private String fileId;
        private String name;
        private String sourceBranchName;
        private Long createdBy;
        private LocalDateTime createdAt;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getSourceBranchName() { return sourceBranchName; }
        public void setSourceBranchName(String sourceBranchName) { this.sourceBranchName = sourceBranchName; }
        public Long getCreatedBy() { return createdBy; }
        public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    public static class CreateBranchRequest {
        private String name;
        private String sourceBranch;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getSourceBranch() { return sourceBranch; }
        public void setSourceBranch(String sourceBranch) { this.sourceBranch = sourceBranch; }
    }

    public static class SetActiveBranchRequest {
        private String branchId;

        public String getBranchId() { return branchId; }
        public void setBranchId(String branchId) { this.branchId = branchId; }
    }

    public static class BranchContentResponse {
        private String content;

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }

    public static class CreateCommitRequest {
        private String message;

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    public static class CommitResponse {
        private Long id;
        private String hash;
        private String branchId;
        private String message;
        private Long committedBy;
        private String committedByName;
        private LocalDateTime createdAt;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getHash() { return hash; }
        public void setHash(String hash) { this.hash = hash; }
        public String getBranchId() { return branchId; }
        public void setBranchId(String branchId) { this.branchId = branchId; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public Long getCommittedBy() { return committedBy; }
        public void setCommittedBy(Long committedBy) { this.committedBy = committedBy; }
        public String getCommittedByName() { return committedByName; }
        public void setCommittedByName(String committedByName) { this.committedByName = committedByName; }
        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    public static class MergeRequest {
        private String targetBranchId;

        public String getTargetBranchId() { return targetBranchId; }
        public void setTargetBranchId(String targetBranchId) { this.targetBranchId = targetBranchId; }
    }

    public static class DiffResponse {
        private String sourceContent;
        private String targetContent;

        public String getSourceContent() { return sourceContent; }
        public void setSourceContent(String sourceContent) { this.sourceContent = sourceContent; }
        public String getTargetContent() { return targetContent; }
        public void setTargetContent(String targetContent) { this.targetContent = targetContent; }
    }

    public static class BranchChangeEvent {
        private String fileId;
        private String newActiveBranchId;
        private Long changedBy;

        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        public String getNewActiveBranchId() { return newActiveBranchId; }
        public void setNewActiveBranchId(String newActiveBranchId) { this.newActiveBranchId = newActiveBranchId; }
        public Long getChangedBy() { return changedBy; }
        public void setChangedBy(Long changedBy) { this.changedBy = changedBy; }
    }
}
