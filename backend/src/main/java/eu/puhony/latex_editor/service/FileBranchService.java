package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.*;
import eu.puhony.latex_editor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
    public String getContent(Long branchId, Long userId) {
        FileBranch branch = branchRepository.findByIdNonDeleted(branchId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        ProjectFile file = branch.getFile();
        folderPermissionService.ensureCanRead(userId, file);

        return resolveContent(branch);
    }

    /**
     * Internal content resolution without permission check.
     * Returns the current state: all changes applied up to the latest for this branch.
     */
    public String resolveContent(FileBranch branch) {
        Long branchId = branch.getId();
        Optional<DocumentChange> latestReplace =
                changeRepository.findLatestReplaceByBranchIdAtOrBefore(branchId, Long.MAX_VALUE);

        if (latestReplace.isPresent()) {
            DocumentChange replace = latestReplace.get();
            List<DocumentChange> changes = changeRepository.findByBranchIdAndIdGreaterThan(branchId, replace.getId());
            return changes.isEmpty() ? replace.getContent()
                    : documentChangeService.applyChangesToContent(replace.getContent(), changes);
        }

        // No REPLACE change yet (main branch before first branch creation): S3 + all changes
        try {
            String originalContent = minioService.getFileContent(branch.getFile().getS3Url());
            List<DocumentChange> changes = changeRepository.findByFileIdAndBranchIdOrderById(
                    branch.getFile().getId(), branchId);
            return changes.isEmpty() ? originalContent
                    : documentChangeService.applyChangesToContent(originalContent, changes);
        } catch (Exception e) {
            throw new RuntimeException("Error resolving content for variant " + branchId, e);
        }
    }

    /**
     * Reconstruct the exact content captured in a commit.
     * Finds the nearest REPLACE change at or before the commit's last_change_id as the base,
     * then replays subsequent line-level changes on top.
     * Falls back to the S3 origin when no REPLACE exists (main branch before first branch-off).
     */
    public String resolveCommitContent(FileCommit commit) {
        Long branchId = commit.getBranch().getId();
        if (commit.getLastChangeId() == null) {
            // No changes yet on this branch at commit time
            try {
                return minioService.getFileContent(commit.getBranch().getFile().getS3Url());
            } catch (Exception e) {
                throw new RuntimeException("Error reading S3 origin for commit " + commit.getId(), e);
            }
        }

        Optional<DocumentChange> latestReplace =
                changeRepository.findLatestReplaceByBranchIdAtOrBefore(branchId, commit.getLastChangeId());

        if (latestReplace.isPresent()) {
            DocumentChange replace = latestReplace.get();
            List<DocumentChange> changes = changeRepository.findByBranchIdAndIdBetween(
                    branchId, replace.getId(), commit.getLastChangeId());
            return changes.isEmpty() ? replace.getContent()
                    : documentChangeService.applyChangesToContent(replace.getContent(), changes);
        }

        // No REPLACE — apply all changes from S3 origin
        try {
            String s3Content = minioService.getFileContent(commit.getBranch().getFile().getS3Url());
            List<DocumentChange> changes = changeRepository.findByBranchIdAndIdBetween(
                    branchId, 0L, commit.getLastChangeId());
            return changes.isEmpty() ? s3Content
                    : documentChangeService.applyChangesToContent(s3Content, changes);
        } catch (Exception e) {
            throw new RuntimeException("Error reading S3 origin for commit " + commit.getId(), e);
        }
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

    public List<FileBranch> listBranchesForHistory(String fileId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        folderPermissionService.ensureCanRead(userId, file);
        return branchRepository.findByFileIdIncludingDeleted(fileId);
    }

    /**
     * Whether a branch has document changes that are not yet captured in a commit.
     */
    public boolean hasUncommittedChanges(Long branchId) {
        Long lastId = commitRepository.findLatestByBranchId(branchId)
                .map(c -> c.getLastChangeId() != null ? c.getLastChangeId() : 0L)
                .orElse(0L);
        return changeRepository.existsByBranchIdAndIdGreaterThan(branchId, lastId);
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

        // Record the fork point as a REPLACE change — this is the base for all future
        // reconstruction on this branch without storing content in the commit itself.
        DocumentChange forkChange = new DocumentChange();
        forkChange.setFile(file);
        forkChange.setUser(user);
        forkChange.setSessionId("system");
        forkChange.setOperation("REPLACE");
        forkChange.setLineNumber(0);
        forkChange.setContent(baseContent);
        forkChange.setBranch(newBranch);
        forkChange = changeRepository.save(forkChange);

        // Initial commit points at the REPLACE change
        FileCommit initialCommit = new FileCommit();
        initialCommit.setBranch(newBranch);
        initialCommit.setLastChangeId(forkChange.getId());
        initialCommit.setMessage("Created from '" + sourceRef + "'");
        initialCommit.setCommittedBy(user);
        commitRepository.save(initialCommit);

        // Carry over only uncommitted (pending) changes from the source branch
        Long sourceLastCommitted = commitRepository.findLatestByBranchId(sourceBranch.getId())
                .map(c -> c.getLastChangeId() != null ? c.getLastChangeId() : 0L)
                .orElse(0L);
        List<DocumentChange> pendingChanges = changeRepository.findByBranchIdAndIdGreaterThan(
                sourceBranch.getId(), sourceLastCommitted);
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
            return resolveCommitContent(latestCommit.get());
        }
        try {
            return minioService.getFileContent(branch.getFile().getS3Url());
        } catch (Exception e) {
            throw new RuntimeException("Error reading base content for variant " + branch.getId(), e);
        }
    }

    /**
     * Commit current state of a branch by recording a reference to the latest document change.
     * Document changes are retained (not deleted) so history can be reconstructed.
     */
    @Transactional
    public FileCommit commit(Long branchId, String message, User user) {
        FileBranch branch = branchRepository.findByIdNonDeleted(branchId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        folderPermissionService.ensureCanEdit(user.getId(), branch.getFile());

        Long lastChangeId = changeRepository.findLatestByBranchId(branchId)
                .map(DocumentChange::getId)
                .orElse(null);

        FileCommit commit = new FileCommit();
        commit.setBranch(branch);
        commit.setLastChangeId(lastChangeId);
        commit.setMessage(message);
        commit.setCommittedBy(user);
        return commitRepository.save(commit);
    }

    /**
     * Get commit history for a branch.
     */
    public List<FileCommit> getCommitHistory(Long branchId, Long userId) {
        FileBranch branch = branchRepository.findByIdNonDeleted(branchId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        folderPermissionService.ensureCanRead(userId, branch.getFile());

        return commitRepository.findByBranchIdOrderByIdDesc(branchId);
    }

    /**
     * Set the active branch for a file.
     */
    @Transactional
    public ProjectFile setActiveBranch(String fileId, Long branchId, Long userId) {
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
     * Result of a merge preview: the merged text (possibly containing conflict markers)
     * and the number of conflicts that require manual resolution.
     */
    public record MergePreviewResult(String content, int conflictCount) {
        public boolean hasConflicts() { return conflictCount > 0; }
    }

    /**
     * Compute a 3-way merge preview between two branches without persisting anything.
     * The merge base is the first (oldest) commit of the source branch, which is the
     * snapshot taken from the target at branch-creation time.
     */
    public MergePreviewResult getMergePreview(Long sourceBranchId, Long targetBranchId, Long userId) {
        FileBranch sourceBranch = branchRepository.findByIdNonDeleted(sourceBranchId)
                .orElseThrow(() -> new RuntimeException("Source variant not found"));
        FileBranch targetBranch = branchRepository.findByIdNonDeleted(targetBranchId)
                .orElseThrow(() -> new RuntimeException("Target variant not found"));

        if (!sourceBranch.getFile().getId().equals(targetBranch.getFile().getId())) {
            throw new RuntimeException("Variants must belong to the same file");
        }

        folderPermissionService.ensureCanRead(userId, sourceBranch.getFile());

        return computePreview(sourceBranch, targetBranch);
    }

    private MergePreviewResult computePreview(FileBranch sourceBranch, FileBranch targetBranch) {
        // Base = content at the moment source was branched off target (its first commit)
        String base = commitRepository.findOldestByBranchId(sourceBranch.getId())
                .map(this::resolveCommitContent)
                .orElseGet(() -> {
                    try { return minioService.getFileContent(sourceBranch.getFile().getS3Url()); }
                    catch (Exception e) { throw new RuntimeException("Cannot resolve merge base", e); }
                });

        String ours   = resolveContent(targetBranch); // what the target looks like now
        String theirs = resolveContent(sourceBranch); // what the source looks like now

        ThreeWayMergeUtil.MergeResult result = ThreeWayMergeUtil.merge(
                base, ours, theirs,
                targetBranch.getName(),
                sourceBranch.getName()
        );
        return new MergePreviewResult(result.content(), result.conflictCount());
    }

    /**
     * Merge source branch into target using a 3-way merge, then soft-delete the source branch.
     *
     * <p>If {@code resolvedContent} is provided (non-null) the caller has already resolved any
     * conflicts in the preview and that content is committed directly.  If it is {@code null}
     * the service performs the 3-way merge automatically; a {@link RuntimeException} is thrown
     * when unresolved conflicts are detected.</p>
     *
     * <p>The source branch is soft-deleted after a successful merge unless it is {@code "main"}.
     * If the source happens to be the active branch the file's active branch is switched to the
     * target first.</p>
     */
    @Transactional
    public FileCommit merge(Long sourceBranchId, Long targetBranchId, String resolvedContent, User user) {
        FileBranch sourceBranch = branchRepository.findByIdNonDeleted(sourceBranchId)
                .orElseThrow(() -> new RuntimeException("Source variant not found"));
        FileBranch targetBranch = branchRepository.findByIdNonDeleted(targetBranchId)
                .orElseThrow(() -> new RuntimeException("Target variant not found"));

        // Both variants must belong to the same file
        if (!sourceBranch.getFile().getId().equals(targetBranch.getFile().getId())) {
            throw new RuntimeException("Variants must belong to the same file");
        }

        folderPermissionService.ensureCanEdit(user.getId(), sourceBranch.getFile());

        String contentToCommit;
        if (resolvedContent != null) {
            contentToCommit = resolvedContent;
        } else {
            MergePreviewResult preview = computePreview(sourceBranch, targetBranch);
            if (preview.hasConflicts()) {
                throw new RuntimeException(
                        "Merge has " + preview.conflictCount() + " conflict(s). Resolve them in the preview before merging.");
            }
            contentToCommit = preview.content();
        }

        // Store merge result as a REPLACE change so reconstruction needs no content in the commit.
        DocumentChange mergeChange = new DocumentChange();
        mergeChange.setFile(targetBranch.getFile());
        mergeChange.setUser(user);
        mergeChange.setSessionId("system");
        mergeChange.setOperation("REPLACE");
        mergeChange.setLineNumber(0);
        mergeChange.setContent(contentToCommit);
        mergeChange.setBranch(targetBranch);
        mergeChange = changeRepository.save(mergeChange);

        FileCommit mergeCommit = new FileCommit();
        mergeCommit.setBranch(targetBranch);
        mergeCommit.setLastChangeId(mergeChange.getId());
        mergeCommit.setMessage("Combined from '" + sourceBranch.getName() + "' into '" + targetBranch.getName() + "'");
        mergeCommit.setCommittedBy(user);
        mergeCommit = commitRepository.save(mergeCommit);

        // Soft-delete source branch after merge (skip if it is the protected "main" branch)
        if (!"main".equals(sourceBranch.getName())) {
            ProjectFile file = sourceBranch.getFile();

            // If source is the active branch, switch active to target first
            if (file.getActiveBranch() != null && file.getActiveBranch().getId().equals(sourceBranchId)) {
                file.setActiveBranch(targetBranch);
                fileRepository.save(file);
            }

            sourceBranch.setDeletedAt(java.time.LocalDateTime.now());
            branchRepository.save(sourceBranch);
        }

        return mergeCommit;
    }

    /**
     * One entry in a blame result: which user last modified this line, and when.
     * userId/userName/timestamp are null for lines whose authorship predates the
     * change history tracked in the database (e.g. the original S3 upload).
     */
    public record BlameEntry(int lineNumber, Long userId, String userName, java.time.LocalDateTime timestamp) {}

    /**
     * Compute per-line blame for the current state of a branch by replaying all
     * DocumentChanges in order and tracking which change last touched each line.
     */
    public List<BlameEntry> getBlame(Long branchId, Long userId) {
        FileBranch branch = branchRepository.findByIdNonDeleted(branchId)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        folderPermissionService.ensureCanRead(userId, branch.getFile());
        return computeBlame(branch);
    }

    private List<BlameEntry> computeBlame(FileBranch branch) {
        Long branchId = branch.getId();
        Optional<DocumentChange> latestReplace =
                changeRepository.findLatestReplaceByBranchIdAtOrBefore(branchId, Long.MAX_VALUE);

        // blame[i] = {userId, userName, timestamp} for line i+1 (null = unknown/original)
        record LineAuthor(Long userId, String userName, java.time.LocalDateTime timestamp) {}
        List<LineAuthor> blame = new java.util.ArrayList<>();
        List<DocumentChange> changes;

        if (latestReplace.isPresent()) {
            DocumentChange replace = latestReplace.get();
            String content = replace.getContent() != null ? replace.getContent() : "";
            String[] lines = content.split("\n", -1);
            String displayName = getDisplayName(replace.getUser());
            for (String ignored : lines) {
                blame.add(new LineAuthor(replace.getUser().getId(), displayName, replace.getCreatedAt()));
            }
            changes = changeRepository.findByBranchIdAndIdGreaterThan(branchId, replace.getId());
        } else {
            try {
                String content = minioService.getFileContent(branch.getFile().getS3Url());
                String[] lines = content.split("\n", -1);
                for (String ignored : lines) {
                    blame.add(new LineAuthor(null, null, null));
                }
            } catch (Exception e) {
                throw new RuntimeException("Error reading file for blame", e);
            }
            changes = changeRepository.findByFileIdAndBranchIdOrderById(branch.getFile().getId(), branchId);
        }

        for (DocumentChange change : changes) {
            int idx = change.getLineNumber() - 1;
            LineAuthor author = new LineAuthor(change.getUser().getId(),
                    getDisplayName(change.getUser()), change.getCreatedAt());
            switch (change.getOperation()) {
                case "MODIFY" -> {
                    if (idx >= 0) {
                        while (blame.size() <= idx) blame.add(new LineAuthor(null, null, null));
                        blame.set(idx, author);
                    }
                }
                case "INSERT_AFTER" -> {
                    int insertAt = idx + 1;
                    if (insertAt >= 0) {
                        while (blame.size() < insertAt) blame.add(new LineAuthor(null, null, null));
                        blame.add(insertAt, author);
                    }
                }
                case "DELETE" -> {
                    if (idx >= 0 && idx < blame.size()) blame.remove(idx);
                }
            }
        }

        List<BlameEntry> result = new java.util.ArrayList<>(blame.size());
        for (int i = 0; i < blame.size(); i++) {
            LineAuthor a = blame.get(i);
            result.add(new BlameEntry(i + 1, a.userId(), a.userName(), a.timestamp()));
        }
        return result;
    }

    private String getDisplayName(User user) {
        return user.getName() != null && !user.getName().isBlank() ? user.getName() : user.getEmail();
    }

    /**
     * Return the content of a file at a specific commit (identified by its short hash).
     */
    public String getContentAtCommit(String hash, Long userId) {
        FileCommit commit = commitRepository.findByHash(hash)
                .orElseThrow(() -> new RuntimeException("Commit not found: " + hash));
        folderPermissionService.ensureCanRead(userId, commit.getBranch().getFile());
        return resolveCommitContent(commit);
    }

    /**
     * Get diff between two commits identified by their hashes.
     * Returns [sourceContent, targetContent].
     */
    public String[] getDiffByHashes(String sourceHash, String targetHash, Long userId) {
        FileCommit source = commitRepository.findByHash(sourceHash)
                .orElseThrow(() -> new RuntimeException("Commit not found: " + sourceHash));
        FileCommit target = commitRepository.findByHash(targetHash)
                .orElseThrow(() -> new RuntimeException("Commit not found: " + targetHash));
        folderPermissionService.ensureCanRead(userId, source.getBranch().getFile());
        return new String[]{resolveCommitContent(source), resolveCommitContent(target)};
    }

    /**
     * Get diff between two branches (source and target content).
     */
    public String[] getDiff(Long sourceBranchId, Long targetBranchId, Long userId) {
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
    public FileBranch renameBranch(Long branchId, String newName, Long userId) {
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
    public void deleteBranch(Long branchId, Long userId) {
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
                    .map(this::resolveCommitContent)
                    .orElse(null);
        }
    }

    /**
     * Resolve an \input @branch reference for compilation at a specific point in time.
     * Returns the content of the latest commit on that branch before or at {@code atTime},
     * or falls back to the file's S3 original if no commits existed yet.
     */
    public String resolveInputReferenceAtTime(Long projectId, String fileName, String branchName, LocalDateTime atTime) {
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

        Optional<FileBranch> branch = branchRepository.findByFileIdAndNameNonDeleted(targetFile.getId(), branchName);
        if (branch.isEmpty()) return null;

        return commitRepository.findLatestByBranchIdBefore(branch.get().getId(), atTime)
                .map(this::resolveCommitContent)
                .orElseGet(() -> {
                    try {
                        return minioService.getFileContent(targetFile.getS3Url());
                    } catch (Exception e) {
                        throw new RuntimeException("Error reading base content for " + fileName, e);
                    }
                });
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
