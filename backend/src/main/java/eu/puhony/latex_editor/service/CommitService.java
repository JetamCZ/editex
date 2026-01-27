package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.dto.BranchPendingChanges;
import eu.puhony.latex_editor.dto.CommitResponse;
import eu.puhony.latex_editor.dto.CreateCommitRequest;
import eu.puhony.latex_editor.entity.Commit;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.repository.CommitRepository;
import eu.puhony.latex_editor.repository.DocumentChangeRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import eu.puhony.latex_editor.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommitService {

    private final CommitRepository commitRepository;
    private final ProjectRepository projectRepository;
    private final DocumentChangeRepository documentChangeRepository;
    private final ProjectMemberService projectMemberService;
    private final ProjectFileRepository projectFileRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MinioService minioService;
    private final DocumentChangeService documentChangeService;

    /**
     * Get all commits for a base project.
     */
    public List<CommitResponse> getCommits(String baseProject, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);
        return commitRepository.findByBaseProjectOrderByCreatedAtDesc(baseProject)
                .stream()
                .map(CommitResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Get commits for a specific branch.
     */
    public List<CommitResponse> getCommitsByBranch(String baseProject, String branch, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);
        return commitRepository.findByBaseProjectAndBranchOrderByCreatedAtDesc(baseProject, branch)
                .stream()
                .map(CommitResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific commit by ID.
     */
    public Optional<CommitResponse> getCommitById(String commitId, Long userId) {
        return commitRepository.findById(commitId)
                .map(commit -> {
                    projectMemberService.ensureCanRead(commit.getBaseProject(), userId);
                    return CommitResponse.from(commit);
                });
    }

    /**
     * Create a user commit (label/snapshot).
     */
    @Transactional
    public CommitResponse createUserCommit(String baseProject, CreateCommitRequest request, User user) {
        projectMemberService.ensureCanEdit(baseProject, user.getId());

        // Get the project for this branch
        Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, request.getBranch())
                .orElseThrow(() -> new RuntimeException("Branch not found: " + request.getBranch()));

        // Get the latest change for this project (for snapshot reference)
        String lastChangeId = documentChangeRepository.findLatestByProjectId(project.getId())
                .map(DocumentChange::getId)
                .orElse(null);

        Commit commit = new Commit();
        commit.setBaseProject(baseProject);
        commit.setBranch(request.getBranch());
        commit.setType(Commit.Type.COMMIT);
        commit.setMessage(request.getMessage());
        commit.setLastChangeId(lastChangeId);
        commit.setCreatedBy(user);

        Commit savedCommit = commitRepository.save(commit);
        return CommitResponse.from(savedCommit);
    }

    /**
     * Create a SPLIT commit when a branch is created.
     * Called automatically by ProjectService.createBranch.
     */
    @Transactional
    public Commit createSplitCommit(String baseProject, String newBranch, String sourceBranch, User user) {
        Commit commit = new Commit();
        commit.setBaseProject(baseProject);
        commit.setBranch(newBranch);
        commit.setType(Commit.Type.SPLIT);
        commit.setSourceBranch(sourceBranch);
        commit.setMessage("Branch '" + newBranch + "' created from '" + sourceBranch + "'");
        commit.setCreatedBy(user);

        return commitRepository.save(commit);
    }

    /**
     * Create a MERGE commit when branches are merged.
     * Called automatically by MergeService.executeMerge.
     */
    @Transactional
    public Commit createMergeCommit(String baseProject, String sourceBranch, String targetBranch, User user) {
        Commit commit = new Commit();
        commit.setBaseProject(baseProject);
        commit.setBranch(targetBranch); // The commit appears on the target branch
        commit.setType(Commit.Type.MERGE);
        commit.setSourceBranch(sourceBranch);
        commit.setTargetBranch(targetBranch);
        commit.setMessage("Merged '" + sourceBranch + "' into '" + targetBranch + "'");
        commit.setCreatedBy(user);

        return commitRepository.save(commit);
    }

    /**
     * Get pending changes info for all branches in a project.
     * Compares the last COMMIT's lastChangeId with the actual latest DocumentChange.
     */
    public List<BranchPendingChanges> getPendingChanges(String baseProject, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);

        List<BranchPendingChanges> result = new ArrayList<>();

        // Get all branches for this project
        List<Project> branches = projectRepository.findAllBranchesByBaseProject(baseProject);

        for (Project branch : branches) {
            BranchPendingChanges pendingChanges = new BranchPendingChanges();
            pendingChanges.setBranch(branch.getBranch());

            // Get the latest COMMIT or AUTOCOMMIT type commit for this branch
            List<Commit> userCommits = commitRepository.findUserCommitsByBranch(baseProject, branch.getBranch());
            Commit lastCommit = userCommits.isEmpty() ? null : userCommits.get(0);
            String lastCommitChangeId = lastCommit != null ? lastCommit.getLastChangeId() : null;
            pendingChanges.setLastCommitChangeId(lastCommitChangeId);

            // Get the actual latest change for this branch
            Optional<DocumentChange> latestChange = documentChangeRepository.findLatestByProjectId(branch.getId());

            if (latestChange.isPresent()) {
                DocumentChange latest = latestChange.get();
                pendingChanges.setCurrentChangeId(latest.getId());
                pendingChanges.setLastChangeAt(latest.getCreatedAt());

                // Determine if there are pending changes
                if (lastCommitChangeId != null) {
                    // Last commit tracked a specific change - check if there are newer changes
                    if (!lastCommitChangeId.equals(latest.getId())) {
                        long pendingCount = documentChangeRepository.countByProjectIdAfterChange(
                                branch.getId(), lastCommitChangeId);
                        pendingChanges.setHasPendingChanges(pendingCount > 0);
                        pendingChanges.setPendingChangeCount((int) pendingCount);
                    } else {
                        // Last commit is up to date
                        pendingChanges.setHasPendingChanges(false);
                        pendingChanges.setPendingChangeCount(0);
                    }
                } else if (lastCommit != null) {
                    // Commit exists but has no lastChangeId (e.g., initial AUTOCOMMIT)
                    // Check if there are any changes created AFTER the commit's timestamp
                    long changesAfterCommit = documentChangeRepository.countByProjectIdAfterTimestamp(
                            branch.getId(), lastCommit.getCreatedAt());
                    pendingChanges.setHasPendingChanges(changesAfterCommit > 0);
                    pendingChanges.setPendingChangeCount((int) changesAfterCommit);
                } else {
                    // No commits at all - all changes are pending
                    long totalChanges = documentChangeRepository.countByProjectId(branch.getId());
                    pendingChanges.setHasPendingChanges(totalChanges > 0);
                    pendingChanges.setPendingChangeCount((int) totalChanges);
                }
            } else {
                // No changes at all in this branch
                pendingChanges.setHasPendingChanges(false);
                pendingChanges.setPendingChangeCount(0);
            }

            result.add(pendingChanges);
        }

        return result;
    }

    /**
     * Get a diff preview of uncommitted changes for a branch.
     * Returns files that have changes, with their committed and current content.
     */
    public List<FileDiff> getUncommittedDiff(String baseProject, String branch, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);

        Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
                .orElseThrow(() -> new RuntimeException("Branch not found: " + branch));

        // Get the latest user commit for this branch
        List<Commit> userCommits = commitRepository.findUserCommitsByBranch(baseProject, branch);
        Commit lastCommit = userCommits.isEmpty() ? null : userCommits.get(0);
        String lastCommitChangeId = lastCommit != null ? lastCommit.getLastChangeId() : null;

        List<FileDiff> diffs = new ArrayList<>();

        // Get all files in this project
        List<ProjectFile> files = projectFileRepository.findByProjectIdNonDeleted(project.getId());

        for (ProjectFile file : files) {
            try {
                // Get original content from S3
                String originalContent = minioService.getFileContent(file.getS3Url());

                // Get all changes for this file
                List<DocumentChange> allChanges = documentChangeRepository.findByFileIdOrderByCreatedAt(file.getId());

                if (allChanges.isEmpty()) {
                    continue; // No changes for this file
                }

                // Determine which changes are uncommitted
                List<DocumentChange> committedChanges = new ArrayList<>();
                List<DocumentChange> uncommittedChanges = new ArrayList<>();

                if (lastCommitChangeId != null) {
                    // Find the index where uncommitted changes start
                    boolean foundCommitPoint = false;
                    for (DocumentChange change : allChanges) {
                        if (!foundCommitPoint) {
                            committedChanges.add(change);
                            if (change.getId().equals(lastCommitChangeId)) {
                                foundCommitPoint = true;
                            }
                        } else {
                            uncommittedChanges.add(change);
                        }
                    }
                } else if (lastCommit != null) {
                    // Commit exists but has no lastChangeId (e.g., initial AUTOCOMMIT)
                    // Only changes created AFTER the commit's timestamp are uncommitted
                    for (DocumentChange change : allChanges) {
                        if (change.getCreatedAt().isAfter(lastCommit.getCreatedAt())) {
                            uncommittedChanges.add(change);
                        } else {
                            committedChanges.add(change);
                        }
                    }
                } else {
                    // No commits at all - all changes are uncommitted
                    uncommittedChanges.addAll(allChanges);
                }

                if (uncommittedChanges.isEmpty()) {
                    continue; // No uncommitted changes for this file
                }

                // Apply committed changes to get the "old" content
                String committedContent = documentChangeService.applyChangesToContent(originalContent, committedChanges);

                // Apply all changes to get the "new" content
                String currentContent = documentChangeService.applyChangesToContent(originalContent, allChanges);

                // Only add if there's actually a difference
                if (!committedContent.equals(currentContent)) {
                    FileDiff diff = new FileDiff();
                    diff.setFileId(file.getId());
                    diff.setFileName(file.getOriginalFileName());
                    diff.setFilePath(file.getProjectFolder().equals("/")
                        ? file.getOriginalFileName()
                        : file.getProjectFolder() + "/" + file.getOriginalFileName());
                    diff.setOldContent(committedContent);
                    diff.setNewContent(currentContent);
                    diff.setChangeCount(uncommittedChanges.size());
                    diffs.add(diff);
                }
            } catch (Exception e) {
                // Log and skip files that can't be read
                System.err.println("Error reading file " + file.getId() + ": " + e.getMessage());
            }
        }

        return diffs;
    }

    /**
     * Discard all uncommitted changes for a branch.
     * Deletes all DocumentChanges after the last user commit (or all changes if no commits exist).
     * Sends a WebSocket reload message to notify clients to refresh their editors.
     */
    @Transactional
    public void discardChanges(String baseProject, String branch, Long userId) {
        projectMemberService.ensureCanEdit(baseProject, userId);

        // Get the project for this branch
        Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
                .orElseThrow(() -> new RuntimeException("Branch not found: " + branch));

        // Get the latest user commit for this branch to find the boundary
        List<Commit> userCommits = commitRepository.findUserCommitsByBranch(baseProject, branch);
        Commit lastCommit = userCommits.isEmpty() ? null : userCommits.get(0);
        String lastCommitChangeId = lastCommit != null ? lastCommit.getLastChangeId() : null;

        // Delete changes after the last commit (or all changes if no commits)
        List<DocumentChange> changesToDelete;
        if (lastCommitChangeId != null) {
            changesToDelete = documentChangeRepository.findByProjectIdAfterChange(project.getId(), lastCommitChangeId);
        } else if (lastCommit != null) {
            // Commit exists but has no lastChangeId - delete changes after commit timestamp
            changesToDelete = documentChangeRepository.findAllByProjectId(project.getId())
                    .stream()
                    .filter(change -> change.getCreatedAt().isAfter(lastCommit.getCreatedAt()))
                    .collect(Collectors.toList());
        } else {
            changesToDelete = documentChangeRepository.findAllByProjectId(project.getId());
        }

        if (!changesToDelete.isEmpty()) {
            documentChangeRepository.deleteAll(changesToDelete);

            // Get all file IDs in this project to notify clients
            List<String> fileIds = projectFileRepository.findByProjectIdNonDeleted(project.getId())
                    .stream()
                    .map(file -> file.getId())
                    .collect(Collectors.toList());

            // Send reload message to all files in this branch
            for (String fileId : fileIds) {
                messagingTemplate.convertAndSend("/topic/document/" + fileId + "/reload",
                        new ReloadMessage(branch, "Changes discarded"));
            }
        }
    }

    /**
     * Simple DTO for reload messages
     */
    public static class ReloadMessage {
        private String branch;
        private String reason;

        public ReloadMessage(String branch, String reason) {
            this.branch = branch;
            this.reason = reason;
        }

        public String getBranch() { return branch; }
        public void setBranch(String branch) { this.branch = branch; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    /**
     * DTO for file diff
     */
    public static class FileDiff {
        private String fileId;
        private String fileName;
        private String filePath;
        private String oldContent;
        private String newContent;
        private int changeCount;

        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getFilePath() { return filePath; }
        public void setFilePath(String filePath) { this.filePath = filePath; }
        public String getOldContent() { return oldContent; }
        public void setOldContent(String oldContent) { this.oldContent = oldContent; }
        public String getNewContent() { return newContent; }
        public void setNewContent(String newContent) { this.newContent = newContent; }
        public int getChangeCount() { return changeCount; }
        public void setChangeCount(int changeCount) { this.changeCount = changeCount; }
    }
}
