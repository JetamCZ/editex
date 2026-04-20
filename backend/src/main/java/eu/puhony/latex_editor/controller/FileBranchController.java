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
            @RequestParam(defaultValue = "false") boolean includeDeleted,
            Authentication authentication) {
        User user = getUser(authentication);
        List<FileBranch> branches = includeDeleted
                ? branchService.listBranchesForHistory(fileId, user.getId())
                : branchService.listBranches(fileId, user.getId());

        List<BranchResponse> response = branches.stream()
                .map(b -> mapBranchResponse(b, includeDeleted))
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
            @PathVariable Long branchId,
            Authentication authentication) {
        User user = getUser(authentication);
        branchService.deleteBranch(branchId, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/files/{fileId}/branches/{branchId}")
    public ResponseEntity<BranchResponse> renameBranch(
            @PathVariable String fileId,
            @PathVariable Long branchId,
            @RequestBody RenameBranchRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        FileBranch branch = branchService.renameBranch(branchId, request.getName(), user.getId());
        return ResponseEntity.ok(mapBranchResponse(branch));
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
            @PathVariable Long branchId,
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
            @PathVariable Long branchId,
            @RequestBody(required = false) CreateCommitRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        String message = request != null ? request.getMessage() : null;

        FileCommit commit = branchService.commit(branchId, message, user);

        return ResponseEntity.status(HttpStatus.CREATED).body(mapCommitResponse(commit));
    }

    @GetMapping("/branches/{branchId}/commits")
    public ResponseEntity<List<CommitResponse>> listCommits(
            @PathVariable Long branchId,
            Authentication authentication) {
        User user = getUser(authentication);
        List<FileCommit> commits = branchService.getCommitHistory(branchId, user.getId());

        List<CommitResponse> response = commits.stream()
                .map(this::mapCommitResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // === Merge & Diff ===

    @GetMapping("/branches/{sourceBranchId}/merge-preview/{targetBranchId}")
    public ResponseEntity<MergePreviewResponse> getMergePreview(
            @PathVariable Long sourceBranchId,
            @PathVariable Long targetBranchId,
            Authentication authentication) {
        User user = getUser(authentication);
        FileBranchService.MergePreviewResult preview =
                branchService.getMergePreview(sourceBranchId, targetBranchId, user.getId());

        MergePreviewResponse response = new MergePreviewResponse();
        response.setContent(preview.content());
        response.setHasConflicts(preview.hasConflicts());
        response.setConflictCount(preview.conflictCount());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/branches/{branchId}/merge")
    public ResponseEntity<CommitResponse> mergeBranch(
            @PathVariable Long branchId,
            @RequestBody MergeRequest request,
            Authentication authentication) {
        User user = getUser(authentication);
        FileCommit mergeCommit = branchService.merge(
                branchId, request.getTargetBranchId(), request.getResolvedContent(), user);

        return ResponseEntity.ok(mapCommitResponse(mergeCommit));
    }

    @GetMapping("/commits/{hash}/content")
    public ResponseEntity<BranchContentResponse> getCommitContent(
            @PathVariable String hash,
            Authentication authentication) {
        User user = getUser(authentication);
        String content = branchService.getContentAtCommit(hash, user.getId());
        BranchContentResponse response = new BranchContentResponse();
        response.setContent(content);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/commits/{sourceHash}/diff/{targetHash}")
    public ResponseEntity<DiffResponse> getDiffByHashes(
            @PathVariable String sourceHash,
            @PathVariable String targetHash,
            Authentication authentication) {
        User user = getUser(authentication);
        String[] contents = branchService.getDiffByHashes(sourceHash, targetHash, user.getId());
        DiffResponse response = new DiffResponse();
        response.setSourceContent(contents[0]);
        response.setTargetContent(contents[1]);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/branches/{branchId}/blame")
    public ResponseEntity<List<BlameResponse>> getBlame(
            @PathVariable Long branchId,
            Authentication authentication) {
        User user = getUser(authentication);
        List<FileBranchService.BlameEntry> entries = branchService.getBlame(branchId, user.getId());

        List<BlameResponse> response = entries.stream()
                .map(e -> new BlameResponse(e.lineNumber(), e.userId(), e.userName(), e.timestamp()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/branches/{sourceBranchId}/diff/{targetBranchId}")
    public ResponseEntity<DiffResponse> getDiff(
            @PathVariable Long sourceBranchId,
            @PathVariable Long targetBranchId,
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
        return mapBranchResponse(branch, false);
    }

    private BranchResponse mapBranchResponse(FileBranch branch, boolean includeDeleted) {
        BranchResponse resp = new BranchResponse();
        resp.setId(branch.getId());
        resp.setFileId(branch.getFile().getId());
        resp.setName(branch.getName());
        resp.setSourceBranchName(branch.getSourceBranch() != null ? branch.getSourceBranch().getName() : null);
        resp.setCreatedBy(branch.getCreatedBy().getId());
        resp.setCreatedAt(branch.getCreatedAt());
        resp.setDeleted(branch.getDeletedAt() != null);
        resp.setHasUncommittedChanges(!resp.isDeleted() && branchService.hasUncommittedChanges(branch.getId()));
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
        private Long id;
        private String fileId;
        private String name;
        private String sourceBranchName;
        private Long createdBy;
        private LocalDateTime createdAt;
        private boolean hasUncommittedChanges;
        private boolean deleted;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
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
        public boolean isHasUncommittedChanges() { return hasUncommittedChanges; }
        public void setHasUncommittedChanges(boolean hasUncommittedChanges) { this.hasUncommittedChanges = hasUncommittedChanges; }
        public boolean isDeleted() { return deleted; }
        public void setDeleted(boolean deleted) { this.deleted = deleted; }
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
        private Long branchId;

        public Long getBranchId() { return branchId; }
        public void setBranchId(Long branchId) { this.branchId = branchId; }
    }

    public static class RenameBranchRequest {
        private String name;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
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
        private Long branchId;
        private String message;
        private Long committedBy;
        private String committedByName;
        private LocalDateTime createdAt;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getHash() { return hash; }
        public void setHash(String hash) { this.hash = hash; }
        public Long getBranchId() { return branchId; }
        public void setBranchId(Long branchId) { this.branchId = branchId; }
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
        private Long targetBranchId;
        /** Optional. When provided the caller has already resolved conflicts in this content. */
        private String resolvedContent;

        public Long getTargetBranchId() { return targetBranchId; }
        public void setTargetBranchId(Long targetBranchId) { this.targetBranchId = targetBranchId; }
        public String getResolvedContent() { return resolvedContent; }
        public void setResolvedContent(String resolvedContent) { this.resolvedContent = resolvedContent; }
    }

    public static class MergePreviewResponse {
        private String content;
        private boolean hasConflicts;
        private int conflictCount;

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public boolean isHasConflicts() { return hasConflicts; }
        public void setHasConflicts(boolean hasConflicts) { this.hasConflicts = hasConflicts; }
        public int getConflictCount() { return conflictCount; }
        public void setConflictCount(int conflictCount) { this.conflictCount = conflictCount; }
    }

    public static class DiffResponse {
        private String sourceContent;
        private String targetContent;

        public String getSourceContent() { return sourceContent; }
        public void setSourceContent(String sourceContent) { this.sourceContent = sourceContent; }
        public String getTargetContent() { return targetContent; }
        public void setTargetContent(String targetContent) { this.targetContent = targetContent; }
    }

    public static class BlameResponse {
        private int lineNumber;
        private Long userId;
        private String userName;
        private LocalDateTime timestamp;

        public BlameResponse(int lineNumber, Long userId, String userName, LocalDateTime timestamp) {
            this.lineNumber = lineNumber;
            this.userId = userId;
            this.userName = userName;
            this.timestamp = timestamp;
        }

        public int getLineNumber() { return lineNumber; }
        public Long getUserId() { return userId; }
        public String getUserName() { return userName; }
        public LocalDateTime getTimestamp() { return timestamp; }
    }

    public static class BranchChangeEvent {
        private String fileId;
        private Long newActiveBranchId;
        private Long changedBy;

        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        public Long getNewActiveBranchId() { return newActiveBranchId; }
        public void setNewActiveBranchId(Long newActiveBranchId) { this.newActiveBranchId = newActiveBranchId; }
        public Long getChangedBy() { return changedBy; }
        public void setChangedBy(Long changedBy) { this.changedBy = changedBy; }
    }
}
