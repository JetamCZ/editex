package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.*;
import eu.puhony.latex_editor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FileBranchService {

    private final FileBranchRepository branchRepository;
    private final FileCommitRepository commitRepository;
    private final DocumentChangeRepository changeRepository;
    private final ProjectFileRepository fileRepository;
    private final FolderPermissionService folderPermissionService;
    private final MinioService minioService;
    private final DocumentChangeService documentChangeService;

    /**
     * Resolve the current content of a branch.
     * Content = latest commit content + pending document_changes applied on top.
     * If no commits exist (legacy), falls back to S3 base + all changes for this branch.
     */
    public String getContent(String branchId, Long userId) {
        FileBranch branch = branchRepository.findByIdNonDeleted(branchId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        ProjectFile file = branch.getFile();
        folderPermissionService.ensureCanRead(userId, file);

        return resolveContent(branch);
    }

    /**
     * Internal content resolution without permission check.
     */
    public String resolveContent(FileBranch branch) {
        String fileId = branch.getFile().getId();
        String branchId = branch.getId();

        Optional<FileCommit> latestCommit = commitRepository.findLatestByBranchId(branchId);

        if (latestCommit.isPresent()) {
            // Has commits: latest commit content + changes after that commit
            String baseContent = latestCommit.get().getContent();
            List<DocumentChange> changes = changeRepository.findByFileIdAndBranchIdOrderById(fileId, branchId);

            // Filter only changes created after the commit
            Long commitId = latestCommit.get().getId();
            List<DocumentChange> pendingChanges = changes.stream()
                    .filter(c -> c.getId() > getLastChangeIdAtCommit(commitId, branchId))
                    .toList();

            if (pendingChanges.isEmpty()) {
                return baseContent;
            }
            return documentChangeService.applyChangesToContent(baseContent, pendingChanges);
        } else {
            // No commits yet (legacy or newly created): S3 base + all branch changes
            try {
                String originalContent = minioService.getFileContent(branch.getFile().getS3Url());
                List<DocumentChange> changes = changeRepository.findByFileIdAndBranchIdOrderById(fileId, branchId);

                if (changes.isEmpty()) {
                    return originalContent;
                }
                return documentChangeService.applyChangesToContent(originalContent, changes);
            } catch (Exception e) {
                throw new RuntimeException("Error resolving content for variant " + branchId, e);
            }
        }
    }

    /**
     * Get the last document_change id that was baked into the latest commit.
     * We use the commit's created_at vs change's created_at to determine this.
     * Simpler approach: all changes on the branch at the time of commit are baked in,
     * so we just use all current changes (they are all post-commit since commit clears them).
     */
    private Long getLastChangeIdAtCommit(Long commitId, String branchId) {
        // Since commit() deletes all changes, any remaining changes are post-commit
        return 0L;
    }

    /**
     * List all branches for a file.
     */
    public List<FileBranch> listBranches(String fileId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        folderPermissionService.ensureCanRead(userId, file);

        return branchRepository.findByFileIdNonDeleted(fileId);
    }

    /**
     * Whether a branch has pending document changes that have not yet been
     * folded into a commit. Since commit() deletes all changes on the branch,
     * any remaining change row means the branch has uncommitted work.
     */
    public boolean hasUncommittedChanges(String branchId) {
        return changeRepository.existsByBranchId(branchId);
    }

    /**
     * Create a new branch from the current state of a source branch.
     *
     * The new branch inherits the source's committed state as its first commit,
     * and any uncommitted document changes on the source are cloned onto the
     * new branch so the working tree carries over (mirroring `git checkout -b`).
     */
    @Transactional
    public FileBranch createBranch(String fileId, String branchName, String sourceBranchName, User user) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        folderPermissionService.ensureCanEdit(user.getId(), file);

        // Check variant name doesn't already exist
        if (branchRepository.findByFileIdAndNameNonDeleted(fileId, branchName).isPresent()) {
            throw new RuntimeException("Variant '" + branchName + "' already exists for this file");
        }

        // Find source variant (default to "main")
        String sourceRef = sourceBranchName != null ? sourceBranchName : "main";
        FileBranch sourceBranch = branchRepository.findByFileIdAndNameNonDeleted(fileId, sourceRef)
                .orElseThrow(() -> new RuntimeException("Source variant '" + sourceRef + "' not found"));

        // Use the source's committed base (latest commit, or S3 origin if none)
        // so pending changes can be replayed on top of the new branch instead
        // of being baked into its initial commit.
        String baseContent = resolveCommittedContent(sourceBranch);

        // Create new branch
        FileBranch newBranch = new FileBranch();
        newBranch.setFile(file);
        newBranch.setName(branchName);
        newBranch.setSourceBranch(sourceBranch);
        newBranch.setCreatedBy(user);
        newBranch = branchRepository.save(newBranch);

        // Create initial commit on new branch with the source's committed base
        FileCommit initialCommit = new FileCommit();
        initialCommit.setBranch(newBranch);
        initialCommit.setContent(baseContent);
        initialCommit.setMessage("Created from '" + sourceRef + "'");
        initialCommit.setCommittedBy(user);
        commitRepository.save(initialCommit);

        // Carry over uncommitted changes from the source branch
        List<DocumentChange> pendingChanges =
                changeRepository.findByFileIdAndBranchIdOrderById(fileId, sourceBranch.getId());
        for (DocumentChange src : pendingChanges) {
            DocumentChange copy = new DocumentChange();
            copy.setFile(file);
            copy.setUser(src.getUser());
            copy.setSessionId(src.getSessionId());
            copy.setOperation(src.getOperation());
            copy.setLineNumber(src.getLineNumber());
            copy.setContent(src.getContent());
            copy.setBranch(newBranch);
            copy.setBaseChangeId(src.getBaseChangeId());
            changeRepository.save(copy);
        }

        return newBranch;
    }

    /**
     * Return only the committed base content of a branch (latest commit, or
     * the original S3 file when the branch has no commits yet). Unlike
     * {@link #resolveContent}, this does not apply pending document changes.
     */
    private String resolveCommittedContent(FileBranch branch) {
        Optional<FileCommit> latestCommit = commitRepository.findLatestByBranchId(branch.getId());
        if (latestCommit.isPresent()) {
            return latestCommit.get().getContent();
        }
        try {
            return minioService.getFileContent(branch.getFile().getS3Url());
        } catch (Exception e) {
            throw new RuntimeException("Error reading base content for variant " + branch.getId(), e);
        }
    }

    /**
     * Commit current state of a branch (snapshot).
     * Resolves content, saves as commit, deletes pending changes.
     */
    @Transactional
    public FileCommit commit(String branchId, String message, User user) {
        FileBranch branch = branchRepository.findByIdNonDeleted(branchId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        ProjectFile file = branch.getFile();
        folderPermissionService.ensureCanEdit(user.getId(), file);

        // Resolve current content
        String currentContent = resolveContent(branch);

        // Create commit
        FileCommit commit = new FileCommit();
        commit.setBranch(branch);
        commit.setContent(currentContent);
        commit.setMessage(message);
        commit.setCommittedBy(user);
        commit = commitRepository.save(commit);

        // Delete all pending changes for this branch (they are now baked into the commit)
        changeRepository.deleteByBranchId(branchId);

        return commit;
    }

    /**
     * Get commit history for a branch.
     */
    public List<FileCommit> getCommitHistory(String branchId, Long userId) {
        FileBranch branch = branchRepository.findByIdNonDeleted(branchId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        folderPermissionService.ensureCanRead(userId, branch.getFile());

        return commitRepository.findByBranchIdOrderByIdDesc(branchId);
    }

    /**
     * Set the active branch for a file.
     */
    @Transactional
    public ProjectFile setActiveBranch(String fileId, String branchId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        folderPermissionService.ensureCanEdit(userId, file);

        FileBranch branch = branchRepository.findByIdNonDeleted(branchId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        if (!branch.getFile().getId().equals(fileId)) {
            throw new RuntimeException("Variant does not belong to this file");
        }

        file.setActiveBranch(branch);
        return fileRepository.save(file);
    }

    /**
     * Merge source branch content into target branch.
     * Simple overwrite: resolves source content, creates commit on target, clears target changes.
     */
    @Transactional
    public FileCommit merge(String sourceBranchId, String targetBranchId, User user) {
        FileBranch sourceBranch = branchRepository.findByIdNonDeleted(sourceBranchId)
                .orElseThrow(() -> new RuntimeException("Source variant not found"));
        FileBranch targetBranch = branchRepository.findByIdNonDeleted(targetBranchId)
                .orElseThrow(() -> new RuntimeException("Target variant not found"));

        // Both variants must belong to the same file
        if (!sourceBranch.getFile().getId().equals(targetBranch.getFile().getId())) {
            throw new RuntimeException("Variants must belong to the same file");
        }

        folderPermissionService.ensureCanEdit(user.getId(), sourceBranch.getFile());

        // Resolve source content
        String sourceContent = resolveContent(sourceBranch);

        // Create merge commit on target
        FileCommit mergeCommit = new FileCommit();
        mergeCommit.setBranch(targetBranch);
        mergeCommit.setContent(sourceContent);
        mergeCommit.setMessage("Combined from '" + sourceBranch.getName() + "' into '" + targetBranch.getName() + "'");
        mergeCommit.setCommittedBy(user);
        mergeCommit = commitRepository.save(mergeCommit);

        // Clear target branch changes
        changeRepository.deleteByBranchId(targetBranchId);

        return mergeCommit;
    }

    /**
     * Get diff between two branches (source and target content).
     */
    public String[] getDiff(String sourceBranchId, String targetBranchId, Long userId) {
        FileBranch sourceBranch = branchRepository.findByIdNonDeleted(sourceBranchId)
                .orElseThrow(() -> new RuntimeException("Source variant not found"));
        FileBranch targetBranch = branchRepository.findByIdNonDeleted(targetBranchId)
                .orElseThrow(() -> new RuntimeException("Target variant not found"));

        folderPermissionService.ensureCanRead(userId, sourceBranch.getFile());

        String sourceContent = resolveContent(sourceBranch);
        String targetContent = resolveContent(targetBranch);

        return new String[]{sourceContent, targetContent};
    }

    /**
     * Rename a branch. Cannot rename "main" and cannot collide with another
     * existing branch on the same file.
     */
    @Transactional
    public FileBranch renameBranch(String branchId, String newName, Long userId) {
        FileBranch branch = branchRepository.findByIdNonDeleted(branchId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        ProjectFile file = branch.getFile();
        folderPermissionService.ensureCanEdit(userId, file);

        String trimmed = newName == null ? "" : newName.trim();
        if (trimmed.isEmpty()) {
            throw new RuntimeException("Variant name cannot be empty");
        }

        if ("main".equals(branch.getName())) {
            throw new RuntimeException("Cannot rename the main variant");
        }

        if (trimmed.equals(branch.getName())) {
            return branch;
        }

        if (branchRepository.findByFileIdAndNameNonDeleted(file.getId(), trimmed).isPresent()) {
            throw new RuntimeException("Variant '" + trimmed + "' already exists for this file");
        }

        branch.setName(trimmed);
        return branchRepository.save(branch);
    }

    /**
     * Soft-delete a branch. Cannot delete active branch or "main".
     */
    @Transactional
    public void deleteBranch(String branchId, Long userId) {
        FileBranch branch = branchRepository.findByIdNonDeleted(branchId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        ProjectFile file = branch.getFile();
        folderPermissionService.ensureCanEdit(userId, file);

        if ("main".equals(branch.getName())) {
            throw new RuntimeException("Cannot delete the main variant");
        }

        if (file.getActiveBranch() != null && file.getActiveBranch().getId().equals(branchId)) {
            throw new RuntimeException("Cannot delete the current variant. Switch to another variant first.");
        }

        // Clear changes for this branch
        changeRepository.deleteByBranchId(branchId);

        // Soft delete
        branch.setDeletedAt(java.time.LocalDateTime.now());
        branchRepository.save(branch);
    }

    /**
     * Resolve an \input version reference for compilation.
     * Finds a file by originalFileName in the project, then resolves the @branch or #hash.
     *
     * @param projectId the project
     * @param fileName  the file name (e.g. "chapter1.tex")
     * @param ref       the reference (branch name or commit hash)
     * @param isBranch  true if @branch, false if #hash
     * @return the resolved file content, or null if not found
     */
    public String resolveInputReference(Long projectId, String fileName, String ref, boolean isBranch) {
        // Find the file in the project by original name
        List<ProjectFile> files = fileRepository.findByProjectIdNonDeleted(projectId);
        ProjectFile targetFile = files.stream()
                .filter(f -> {
                    String name = f.getOriginalFileName();
                    String nameNoExt = name.replaceAll("\\.tex$", "");
                    String fileNameNoExt = fileName.replaceAll("\\.tex$", "");
                    return name.equals(fileName) || nameNoExt.equals(fileNameNoExt)
                            || name.equals(fileName + ".tex");
                })
                .findFirst()
                .orElse(null);

        if (targetFile == null) return null;

        if (isBranch) {
            // @branch — resolve branch by name
            return branchRepository.findByFileIdAndNameNonDeleted(targetFile.getId(), ref)
                    .map(this::resolveContent)
                    .orElse(null);
        } else {
            // #hash — resolve commit by hash
            return commitRepository.findByHashAndProjectId(ref, projectId)
                    .map(FileCommit::getContent)
                    .orElse(null);
        }
    }

    /**
     * Ensure a file has a main branch (used when creating/uploading files).
     */
    @Transactional
    public FileBranch ensureMainBranch(ProjectFile file, User user) {
        return branchRepository.findByFileIdAndNameNonDeleted(file.getId(), "main")
                .orElseGet(() -> {
                    FileBranch mainBranch = new FileBranch();
                    mainBranch.setFile(file);
                    mainBranch.setName("main");
                    mainBranch.setCreatedBy(user);
                    mainBranch = branchRepository.save(mainBranch);

                    file.setActiveBranch(mainBranch);
                    fileRepository.save(file);

                    return mainBranch;
                });
    }
}
