package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.dto.*;
import eu.puhony.latex_editor.entity.Commit;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.CommitRepository;
import eu.puhony.latex_editor.repository.DocumentChangeRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import eu.puhony.latex_editor.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MergeService {

    private final ProjectRepository projectRepository;
    private final ProjectFileRepository projectFileRepository;
    private final DocumentChangeRepository documentChangeRepository;
    private final CommitRepository commitRepository;
    private final ProjectMemberService projectMemberService;
    private final MinioService minioService;
    private final DocumentChangeService documentChangeService;

    // Text file extensions that support line-level conflict detection
    private static final Set<String> TEXT_EXTENSIONS = Set.of(
            ".tex", ".bib", ".txt", ".sty", ".cls", ".md", ".json", ".xml", ".html", ".css", ".js"
    );

    /**
     * Preview merge between source and target branches.
     * Analyzes files and detects conflicts.
     */
    public MergePreviewResponse previewMerge(String baseProject, String sourceBranch, String targetBranch, Long userId) {
        projectMemberService.ensureCanEdit(baseProject, userId);

        // Get source project
        Project sourceProject = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, sourceBranch)
                .orElse(null);
        if (sourceProject == null) {
            return MergePreviewResponse.error(sourceBranch, targetBranch, "Source branch not found");
        }

        // Get target project
        Project targetProject = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, targetBranch)
                .orElse(null);
        if (targetProject == null) {
            return MergePreviewResponse.error(sourceBranch, targetBranch, "Target branch not found");
        }

        // Validate merge direction: source must have been created from target
        if (sourceProject.getSourceBranch() == null) {
            return MergePreviewResponse.error(sourceBranch, targetBranch,
                    "Cannot merge main branch. Only branches created from other branches can be merged.");
        }
        if (!targetBranch.equals(sourceProject.getSourceBranch())) {
            return MergePreviewResponse.error(sourceBranch, targetBranch,
                    "Branch '" + sourceBranch + "' can only be merged into its parent branch '" +
                    sourceProject.getSourceBranch() + "'");
        }

        // Get files from both branches
        List<ProjectFile> sourceFiles = projectFileRepository.findByProjectIdNonDeleted(sourceProject.getId());
        List<ProjectFile> targetFiles = projectFileRepository.findByProjectIdNonDeleted(targetProject.getId());

        // Create maps by file path (projectFolder + originalFileName)
        Map<String, ProjectFile> sourceFileMap = sourceFiles.stream()
                .collect(Collectors.toMap(this::getFilePath, f -> f));
        Map<String, ProjectFile> targetFileMap = targetFiles.stream()
                .collect(Collectors.toMap(this::getFilePath, f -> f));

        // Analyze all unique file paths
        Set<String> allPaths = new HashSet<>();
        allPaths.addAll(sourceFileMap.keySet());
        allPaths.addAll(targetFileMap.keySet());

        List<FileMergeStatus> fileStatuses = new ArrayList<>();
        int addedCount = 0, modifiedCount = 0, deletedCount = 0, conflictCount = 0, unchangedCount = 0;

        for (String path : allPaths) {
            ProjectFile sourceFile = sourceFileMap.get(path);
            ProjectFile targetFile = targetFileMap.get(path);

            FileMergeStatus status = analyzeFilePair(sourceFile, targetFile, path);
            fileStatuses.add(status);

            switch (status.getStatus()) {
                case ADDED -> addedCount++;
                case MODIFIED -> modifiedCount++;
                case DELETED -> deletedCount++;
                case CONFLICT -> conflictCount++;
                case UNCHANGED -> unchangedCount++;
            }
        }

        // Sort by status (conflicts first) then by path
        fileStatuses.sort((a, b) -> {
            int statusCompare = getStatusPriority(a.getStatus()) - getStatusPriority(b.getStatus());
            return statusCompare != 0 ? statusCompare : a.getFilePath().compareTo(b.getFilePath());
        });

        MergePreviewResponse response = new MergePreviewResponse();
        response.setSourceBranch(sourceBranch);
        response.setTargetBranch(targetBranch);
        response.setCanMerge(true);
        response.setFiles(fileStatuses);
        response.setAddedCount(addedCount);
        response.setModifiedCount(modifiedCount);
        response.setDeletedCount(deletedCount);
        response.setConflictCount(conflictCount);
        response.setUnchangedCount(unchangedCount);

        return response;
    }

    /**
     * Execute merge with resolved conflicts.
     */
    @Transactional
    public MergeExecuteResponse executeMerge(String baseProject, MergeExecuteRequest request, User user) {
        projectMemberService.ensureCanManage(baseProject, user.getId());

        String sourceBranch = request.getSourceBranch();
        String targetBranch = request.getTargetBranch();

        // Get projects
        Project sourceProject = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, sourceBranch)
                .orElseThrow(() -> new RuntimeException("Source branch not found"));
        Project targetProject = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, targetBranch)
                .orElseThrow(() -> new RuntimeException("Target branch not found"));

        // Validate merge direction
        if (sourceProject.getSourceBranch() == null || !targetBranch.equals(sourceProject.getSourceBranch())) {
            return MergeExecuteResponse.error("Invalid merge direction");
        }

        // Get current preview to determine what needs to be done
        MergePreviewResponse preview = previewMerge(baseProject, sourceBranch, targetBranch, user.getId());
        if (!preview.isCanMerge()) {
            return MergeExecuteResponse.error(preview.getValidationError());
        }

        // Create a map of resolutions for quick lookup
        Map<String, ResolvedFile> resolutionMap = new HashMap<>();
        if (request.getResolvedFiles() != null) {
            for (ResolvedFile resolved : request.getResolvedFiles()) {
                resolutionMap.put(resolved.getFilePath(), resolved);
            }
        }

        int added = 0, modified = 0, deleted = 0;

        try {
            for (FileMergeStatus fileStatus : preview.getFiles()) {
                ResolvedFile resolution = resolutionMap.get(fileStatus.getFilePath());

                switch (fileStatus.getStatus()) {
                    case ADDED -> {
                        // Copy file from source to target
                        copyFileToTarget(baseProject, targetBranch, targetProject,
                                fileStatus.getSourceFileId(), fileStatus.getFilePath(), user);
                        added++;
                    }
                    case MODIFIED -> {
                        // Update target file with auto-merged content (or source content if no auto-merge available)
                        if (fileStatus.getAutoMergedContent() != null) {
                            updateTargetFileWithContent(baseProject, targetBranch, targetProject,
                                    fileStatus.getTargetFileId(), fileStatus.getFilePath(),
                                    fileStatus.getAutoMergedContent(), user);
                        } else {
                            updateTargetFile(baseProject, targetBranch, targetProject,
                                    fileStatus.getSourceFileId(), fileStatus.getTargetFileId(),
                                    fileStatus.getFilePath(), user);
                        }
                        modified++;
                    }
                    case DELETED -> {
                        // Soft delete file in target
                        deleteTargetFile(fileStatus.getTargetFileId());
                        deleted++;
                    }
                    case CONFLICT -> {
                        // Must have resolution
                        if (resolution == null) {
                            return MergeExecuteResponse.error(
                                    "Missing resolution for conflicted file: " + fileStatus.getFilePath());
                        }
                        applyResolution(baseProject, targetBranch, targetProject, fileStatus, resolution, user);
                        if (resolution.getResolution() == ResolvedFile.Resolution.DELETE) {
                            deleted++;
                        } else {
                            modified++;
                        }
                    }
                    case UNCHANGED -> {
                        // Nothing to do
                    }
                }
            }

            // Create MERGE commit to record the merge
            Commit mergeCommit = new Commit();
            mergeCommit.setBaseProject(baseProject);
            mergeCommit.setBranch(targetBranch);
            mergeCommit.setType(Commit.Type.MERGE);
            mergeCommit.setSourceBranch(sourceBranch);
            mergeCommit.setTargetBranch(targetBranch);
            mergeCommit.setMessage("Merged '" + sourceBranch + "' into '" + targetBranch + "'");
            mergeCommit.setCreatedBy(user);
            commitRepository.save(mergeCommit);

            // Handle post-merge action
            String postActionResult = handlePostMergeAction(baseProject, sourceBranch, targetBranch,
                    request.getPostMergeAction(), user);

            return MergeExecuteResponse.success(added, modified, deleted, postActionResult);

        } catch (Exception e) {
            return MergeExecuteResponse.error("Merge failed: " + e.getMessage());
        }
    }

    /**
     * Get current content of a file with all DocumentChanges applied.
     */
    public String getCurrentContent(String fileId, Long userId) {
        ProjectFile file = projectFileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanRead(file.getProject().getBaseProject(), userId);

        try {
            String originalContent = minioService.getFileContent(file.getS3Url());

            // For text files, apply document changes
            if (isTextFile(file.getOriginalFileName())) {
                List<DocumentChange> changes = documentChangeRepository.findByFileIdOrderByCreatedAt(fileId);
                return documentChangeService.applyChangesToContent(originalContent, changes);
            }

            return originalContent;
        } catch (Exception e) {
            throw new RuntimeException("Failed to get file content", e);
        }
    }

    /**
     * Perform a 3-way merge and detect true conflicts.
     * Returns null if auto-merge is possible (no conflicts), or the list of conflicts.
     * Also returns the auto-merged content if no conflicts.
     */
    public ThreeWayMergeResult threeWayMerge(String baseContent, String sourceContent, String targetContent) {
        List<String> baseLines = Arrays.asList(baseContent.split("\n", -1));
        List<String> sourceLines = Arrays.asList(sourceContent.split("\n", -1));
        List<String> targetLines = Arrays.asList(targetContent.split("\n", -1));

        // Find changes from base to source
        List<DiffHunk> sourceChanges = computeDiffHunks(baseLines, sourceLines);
        // Find changes from base to target
        List<DiffHunk> targetChanges = computeDiffHunks(baseLines, targetLines);

        // If neither branch changed anything, no merge needed
        if (sourceChanges.isEmpty() && targetChanges.isEmpty()) {
            return new ThreeWayMergeResult(baseContent, Collections.emptyList(), true);
        }

        // If only source changed, use source content
        if (targetChanges.isEmpty()) {
            return new ThreeWayMergeResult(sourceContent, Collections.emptyList(), true);
        }

        // If only target changed, keep target content (no changes needed)
        if (sourceChanges.isEmpty()) {
            return new ThreeWayMergeResult(targetContent, Collections.emptyList(), true);
        }

        // Both branches have changes - check for overlapping regions (conflicts)
        List<LineConflict> conflicts = new ArrayList<>();
        List<MergeRegion> mergeRegions = new ArrayList<>();

        int sourceIdx = 0;
        int targetIdx = 0;

        while (sourceIdx < sourceChanges.size() || targetIdx < targetChanges.size()) {
            DiffHunk sourceHunk = sourceIdx < sourceChanges.size() ? sourceChanges.get(sourceIdx) : null;
            DiffHunk targetHunk = targetIdx < targetChanges.size() ? targetChanges.get(targetIdx) : null;

            if (sourceHunk == null) {
                // Only target changes left
                mergeRegions.add(new MergeRegion(MergeRegionType.TARGET, targetHunk));
                targetIdx++;
            } else if (targetHunk == null) {
                // Only source changes left
                mergeRegions.add(new MergeRegion(MergeRegionType.SOURCE, sourceHunk));
                sourceIdx++;
            } else if (hunksOverlap(sourceHunk, targetHunk)) {
                // Overlapping changes - check if they're the same or different
                if (hunksAreIdentical(sourceHunk, targetHunk)) {
                    // Same change in both - use either one
                    mergeRegions.add(new MergeRegion(MergeRegionType.BOTH_SAME, sourceHunk));
                } else {
                    // Different changes to overlapping region - true conflict
                    LineConflict conflict = createConflict(sourceHunk, targetHunk, sourceLines, targetLines);
                    conflicts.add(conflict);
                    mergeRegions.add(new MergeRegion(MergeRegionType.CONFLICT, sourceHunk, targetHunk));
                }
                sourceIdx++;
                targetIdx++;
            } else if (sourceHunk.baseStart < targetHunk.baseStart) {
                // Source change comes first
                mergeRegions.add(new MergeRegion(MergeRegionType.SOURCE, sourceHunk));
                sourceIdx++;
            } else {
                // Target change comes first
                mergeRegions.add(new MergeRegion(MergeRegionType.TARGET, targetHunk));
                targetIdx++;
            }
        }

        // If there are conflicts, return them
        if (!conflicts.isEmpty()) {
            return new ThreeWayMergeResult(null, conflicts, false);
        }

        // No conflicts - build merged content
        String mergedContent = buildMergedContent(baseLines, sourceLines, targetLines, mergeRegions);
        return new ThreeWayMergeResult(mergedContent, Collections.emptyList(), true);
    }

    /**
     * Compute diff hunks between two versions of content.
     */
    private List<DiffHunk> computeDiffHunks(List<String> baseLines, List<String> changedLines) {
        List<DiffHunk> hunks = new ArrayList<>();

        int[][] lcs = computeLCS(baseLines, changedLines);

        // Backtrack to find differences
        int i = baseLines.size();
        int j = changedLines.size();

        List<int[]> diffs = new ArrayList<>(); // [baseStart, baseEnd, changedStart, changedEnd]

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && baseLines.get(i - 1).equals(changedLines.get(j - 1))) {
                i--;
                j--;
            } else if (j > 0 && (i == 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
                // Line added in changed version
                diffs.add(new int[]{i, i, j - 1, j});
                j--;
            } else if (i > 0) {
                // Line deleted/modified from base
                diffs.add(new int[]{i - 1, i, j, j});
                i--;
            }
        }

        Collections.reverse(diffs);

        // Merge adjacent diffs into hunks
        if (diffs.isEmpty()) {
            return hunks;
        }

        int[] current = diffs.get(0);
        for (int k = 1; k < diffs.size(); k++) {
            int[] next = diffs.get(k);
            // If adjacent or overlapping, merge
            if (next[0] <= current[1] + 1 && next[2] <= current[3] + 1) {
                current[1] = Math.max(current[1], next[1]);
                current[3] = Math.max(current[3], next[3]);
            } else {
                hunks.add(new DiffHunk(current[0], current[1], current[2], current[3]));
                current = next;
            }
        }
        hunks.add(new DiffHunk(current[0], current[1], current[2], current[3]));

        return hunks;
    }

    private boolean hunksOverlap(DiffHunk a, DiffHunk b) {
        // Two hunks overlap if their base ranges intersect
        return !(a.baseEnd <= b.baseStart || b.baseEnd <= a.baseStart);
    }

    private boolean hunksAreIdentical(DiffHunk sourceHunk, DiffHunk targetHunk) {
        // Hunks are identical if they affect the same base region and have the same new content
        return sourceHunk.baseStart == targetHunk.baseStart &&
               sourceHunk.baseEnd == targetHunk.baseEnd &&
               sourceHunk.changedStart == targetHunk.changedStart &&
               sourceHunk.changedEnd == targetHunk.changedEnd;
    }

    private LineConflict createConflict(DiffHunk sourceHunk, DiffHunk targetHunk,
                                         List<String> sourceLines, List<String> targetLines) {
        List<String> sourceConflictLines = sourceHunk.changedStart < sourceHunk.changedEnd
                ? new ArrayList<>(sourceLines.subList(sourceHunk.changedStart, sourceHunk.changedEnd))
                : Collections.emptyList();
        List<String> targetConflictLines = targetHunk.changedStart < targetHunk.changedEnd
                ? new ArrayList<>(targetLines.subList(targetHunk.changedStart, targetHunk.changedEnd))
                : Collections.emptyList();

        LineConflict conflict = new LineConflict();
        conflict.setStartLine(Math.min(sourceHunk.baseStart, targetHunk.baseStart) + 1);
        conflict.setEndLine(Math.max(sourceHunk.baseEnd, targetHunk.baseEnd));
        conflict.setSourceLines(sourceConflictLines);
        conflict.setTargetLines(targetConflictLines);
        conflict.setContextStartLine(Math.max(1, conflict.getStartLine() - 3));
        conflict.setContextEndLine(conflict.getEndLine() + 3);

        return conflict;
    }

    private String buildMergedContent(List<String> baseLines, List<String> sourceLines,
                                       List<String> targetLines, List<MergeRegion> regions) {
        // Start with target lines (since we're merging into target) and apply source changes
        List<String> result = new ArrayList<>(targetLines);

        // Sort regions by their position in base (reverse order for easier modification)
        regions.sort((a, b) -> Integer.compare(b.getBaseStart(), a.getBaseStart()));

        for (MergeRegion region : regions) {
            if (region.type == MergeRegionType.SOURCE) {
                // Apply source change: find corresponding position in result and replace
                // This is simplified - in practice you'd need to track position shifts
                DiffHunk hunk = region.sourceHunk;
                List<String> newLines = hunk.changedStart < hunk.changedEnd
                        ? sourceLines.subList(hunk.changedStart, hunk.changedEnd)
                        : Collections.emptyList();

                // Find where in target this corresponds to
                int targetPos = findCorrespondingPosition(baseLines, targetLines, hunk.baseStart);
                int targetEnd = findCorrespondingPosition(baseLines, targetLines, hunk.baseEnd);

                if (targetPos >= 0 && targetEnd >= targetPos && targetEnd <= result.size()) {
                    // Remove old lines and insert new ones
                    for (int i = targetEnd - 1; i >= targetPos; i--) {
                        if (i < result.size()) {
                            result.remove(i);
                        }
                    }
                    result.addAll(targetPos, newLines);
                }
            }
            // For TARGET and BOTH_SAME, the content is already in result (target)
        }

        return String.join("\n", result);
    }

    private int findCorrespondingPosition(List<String> baseLines, List<String> targetLines, int basePos) {
        // Simple approach: find the position in target that corresponds to basePos
        // This uses LCS to map positions
        if (basePos == 0) return 0;
        if (basePos >= baseLines.size()) return targetLines.size();

        int[][] lcs = computeLCS(baseLines, targetLines);
        int i = basePos;
        int j = 0;

        // Find the target position that matches
        for (int ti = 0; ti < targetLines.size() && i > 0; ti++) {
            if (i > 0 && ti > 0 && i <= baseLines.size() && baseLines.get(i - 1).equals(targetLines.get(ti - 1))) {
                j = ti;
                i--;
            } else if (ti < targetLines.size()) {
                j = ti + 1;
            }
        }

        return Math.min(j, targetLines.size());
    }

    // Helper classes for 3-way merge
    public record ThreeWayMergeResult(String mergedContent, List<LineConflict> conflicts, boolean canAutoMerge) {}

    private record DiffHunk(int baseStart, int baseEnd, int changedStart, int changedEnd) {}

    private enum MergeRegionType { SOURCE, TARGET, BOTH_SAME, CONFLICT }

    private static class MergeRegion {
        MergeRegionType type;
        DiffHunk sourceHunk;
        DiffHunk targetHunk;

        MergeRegion(MergeRegionType type, DiffHunk hunk) {
            this.type = type;
            this.sourceHunk = hunk;
        }

        MergeRegion(MergeRegionType type, DiffHunk sourceHunk, DiffHunk targetHunk) {
            this.type = type;
            this.sourceHunk = sourceHunk;
            this.targetHunk = targetHunk;
        }

        int getBaseStart() {
            return sourceHunk != null ? sourceHunk.baseStart : (targetHunk != null ? targetHunk.baseStart : 0);
        }
    }

    // Helper methods

    private String getFilePath(ProjectFile file) {
        return file.getProjectFolder() + "/" + file.getOriginalFileName();
    }

    private boolean isTextFile(String fileName) {
        String lowerName = fileName.toLowerCase();
        return TEXT_EXTENSIONS.stream().anyMatch(lowerName::endsWith);
    }

    private int getStatusPriority(FileMergeStatus.Status status) {
        return switch (status) {
            case CONFLICT -> 0;
            case ADDED -> 1;
            case MODIFIED -> 2;
            case DELETED -> 3;
            case UNCHANGED -> 4;
        };
    }

    private FileMergeStatus analyzeFilePair(ProjectFile sourceFile, ProjectFile targetFile, String path) {
        FileMergeStatus status = new FileMergeStatus();
        status.setFilePath(path);
        status.setFileName(path.substring(path.lastIndexOf('/') + 1));

        if (sourceFile != null) {
            status.setSourceFileId(sourceFile.getId());
            status.setSourceFileSize(sourceFile.getFileSize());
            status.setFileId(sourceFile.getId());
            status.setTextFile(isTextFile(sourceFile.getOriginalFileName()));
        }

        if (targetFile != null) {
            status.setTargetFileId(targetFile.getId());
            status.setTargetFileSize(targetFile.getFileSize());
            if (status.getFileId() == null) {
                status.setFileId(targetFile.getId());
            }
            status.setTextFile(isTextFile(targetFile.getOriginalFileName()));
        }

        // File only in source (new file)
        if (sourceFile != null && targetFile == null) {
            status.setStatus(FileMergeStatus.Status.ADDED);
            return status;
        }

        // File only in target (deleted in source - will propagate deletion)
        if (sourceFile == null && targetFile != null) {
            status.setStatus(FileMergeStatus.Status.DELETED);
            return status;
        }

        // File in both branches - compare content using 3-way merge
        try {
            String sourceContent = getCurrentContentInternal(sourceFile);
            String targetContent = getCurrentContentInternal(targetFile);

            if (sourceContent.equals(targetContent)) {
                status.setStatus(FileMergeStatus.Status.UNCHANGED);
                return status;
            }

            // Content differs
            if (status.isTextFile()) {
                // Get base content (source file's S3 content without DocumentChanges)
                // This represents the state when the branch was created
                String baseContent = getBaseContent(sourceFile);

                // Perform 3-way merge
                ThreeWayMergeResult mergeResult = threeWayMerge(baseContent, sourceContent, targetContent);

                if (mergeResult.canAutoMerge()) {
                    // Can auto-merge without conflicts
                    status.setStatus(FileMergeStatus.Status.MODIFIED);
                    status.setAutoMergedContent(mergeResult.mergedContent());
                } else {
                    // Has true conflicts
                    status.setStatus(FileMergeStatus.Status.CONFLICT);
                    status.setConflicts(mergeResult.conflicts());
                }
            } else {
                // Binary files with different content are always conflicts
                status.setStatus(FileMergeStatus.Status.CONFLICT);
                status.setBinaryConflict(true);
            }

        } catch (Exception e) {
            // If we can't read content, treat as conflict
            status.setStatus(FileMergeStatus.Status.CONFLICT);
        }

        return status;
    }

    /**
     * Get the base content of a source file (S3 content without DocumentChanges).
     * This represents the state when the branch was created from target.
     */
    private String getBaseContent(ProjectFile sourceFile) {
        try {
            return minioService.getFileContent(sourceFile.getS3Url());
        } catch (Exception e) {
            throw new RuntimeException("Failed to get base content", e);
        }
    }

    // Overload that skips permission check for internal use
    private String getCurrentContentInternal(ProjectFile file) {
        try {
            String originalContent = minioService.getFileContent(file.getS3Url());

            if (isTextFile(file.getOriginalFileName())) {
                List<DocumentChange> changes = documentChangeRepository.findByFileIdOrderByCreatedAt(file.getId());
                return documentChangeService.applyChangesToContent(originalContent, changes);
            }

            return originalContent;
        } catch (Exception e) {
            throw new RuntimeException("Failed to get file content", e);
        }
    }

    private void copyFileToTarget(String baseProject, String targetBranch, Project targetProject,
                                   String sourceFileId, String filePath, User user) throws Exception {
        ProjectFile sourceFile = projectFileRepository.findByIdNonDeleted(sourceFileId)
                .orElseThrow(() -> new RuntimeException("Source file not found"));

        String folder = filePath.substring(0, filePath.lastIndexOf('/'));
        String destFolder = baseProject + "/" + targetBranch + folder;

        String content = getCurrentContentInternal(sourceFile);
        String newS3Url = minioService.uploadContent(content, destFolder,
                sourceFile.getFileName(), sourceFile.getFileType());

        ProjectFile newFile = new ProjectFile();
        newFile.setProject(targetProject);
        newFile.setProjectFolder(folder);
        newFile.setFileName(sourceFile.getFileName());
        newFile.setOriginalFileName(sourceFile.getOriginalFileName());
        newFile.setFileSize((long) content.getBytes(StandardCharsets.UTF_8).length);
        newFile.setFileType(sourceFile.getFileType());
        newFile.setS3Url(newS3Url);
        newFile.setUploadedBy(user);
        projectFileRepository.save(newFile);
    }

    private void updateTargetFile(String baseProject, String targetBranch, Project targetProject,
                                   String sourceFileId, String targetFileId, String filePath, User user) throws Exception {
        ProjectFile sourceFile = projectFileRepository.findByIdNonDeleted(sourceFileId)
                .orElseThrow(() -> new RuntimeException("Source file not found"));
        ProjectFile targetFile = projectFileRepository.findByIdNonDeleted(targetFileId)
                .orElseThrow(() -> new RuntimeException("Target file not found"));

        String content = getCurrentContentInternal(sourceFile);

        String folder = filePath.substring(0, filePath.lastIndexOf('/'));
        String destFolder = baseProject + "/" + targetBranch + folder;
        String newS3Url = minioService.uploadContent(content, destFolder,
                targetFile.getFileName(), targetFile.getFileType());

        // Delete old changes for target file
        documentChangeRepository.findByFileIdOrderByCreatedAt(targetFileId)
                .forEach(documentChangeRepository::delete);

        // Update target file with new S3 URL
        targetFile.setS3Url(newS3Url);
        targetFile.setFileSize((long) content.getBytes(StandardCharsets.UTF_8).length);
        projectFileRepository.save(targetFile);
    }

    private void updateTargetFileWithContent(String baseProject, String targetBranch, Project targetProject,
                                              String targetFileId, String filePath, String content, User user) throws Exception {
        ProjectFile targetFile = projectFileRepository.findByIdNonDeleted(targetFileId)
                .orElseThrow(() -> new RuntimeException("Target file not found"));

        String folder = filePath.substring(0, filePath.lastIndexOf('/'));
        String destFolder = baseProject + "/" + targetBranch + folder;
        String newS3Url = minioService.uploadContent(content, destFolder,
                targetFile.getFileName(), targetFile.getFileType());

        // Delete old changes for target file
        documentChangeRepository.findByFileIdOrderByCreatedAt(targetFileId)
                .forEach(documentChangeRepository::delete);

        // Update target file with new S3 URL
        targetFile.setS3Url(newS3Url);
        targetFile.setFileSize((long) content.getBytes(StandardCharsets.UTF_8).length);
        projectFileRepository.save(targetFile);
    }

    private void deleteTargetFile(String targetFileId) {
        ProjectFile targetFile = projectFileRepository.findByIdNonDeleted(targetFileId)
                .orElseThrow(() -> new RuntimeException("Target file not found"));
        targetFile.setDeletedAt(LocalDateTime.now());
        projectFileRepository.save(targetFile);
    }

    private void applyResolution(String baseProject, String targetBranch, Project targetProject,
                                  FileMergeStatus fileStatus, ResolvedFile resolution, User user) throws Exception {
        switch (resolution.getResolution()) {
            case USE_SOURCE -> {
                if (fileStatus.getTargetFileId() != null) {
                    updateTargetFile(baseProject, targetBranch, targetProject,
                            fileStatus.getSourceFileId(), fileStatus.getTargetFileId(),
                            fileStatus.getFilePath(), user);
                } else {
                    copyFileToTarget(baseProject, targetBranch, targetProject,
                            fileStatus.getSourceFileId(), fileStatus.getFilePath(), user);
                }
            }
            case USE_TARGET -> {
                // Keep target as-is, nothing to do
            }
            case USE_MERGED -> {
                String mergedContent = resolution.getResolvedContent();
                if (mergedContent == null) {
                    throw new RuntimeException("Merged content is required for USE_MERGED resolution");
                }

                String folder = fileStatus.getFilePath().substring(0, fileStatus.getFilePath().lastIndexOf('/'));
                String destFolder = baseProject + "/" + targetBranch + folder;

                if (fileStatus.getTargetFileId() != null) {
                    // Update existing target file
                    ProjectFile targetFile = projectFileRepository.findByIdNonDeleted(fileStatus.getTargetFileId())
                            .orElseThrow(() -> new RuntimeException("Target file not found"));

                    String newS3Url = minioService.uploadContent(mergedContent, destFolder,
                            targetFile.getFileName(), targetFile.getFileType());

                    // Delete old changes
                    documentChangeRepository.findByFileIdOrderByCreatedAt(fileStatus.getTargetFileId())
                            .forEach(documentChangeRepository::delete);

                    targetFile.setS3Url(newS3Url);
                    targetFile.setFileSize((long) mergedContent.getBytes(StandardCharsets.UTF_8).length);
                    projectFileRepository.save(targetFile);
                } else {
                    // Create new file with merged content
                    ProjectFile sourceFile = projectFileRepository.findByIdNonDeleted(fileStatus.getSourceFileId())
                            .orElseThrow(() -> new RuntimeException("Source file not found"));

                    String newS3Url = minioService.uploadContent(mergedContent, destFolder,
                            sourceFile.getFileName(), sourceFile.getFileType());

                    ProjectFile newFile = new ProjectFile();
                    newFile.setProject(targetProject);
                    newFile.setProjectFolder(folder);
                    newFile.setFileName(sourceFile.getFileName());
                    newFile.setOriginalFileName(sourceFile.getOriginalFileName());
                    newFile.setFileSize((long) mergedContent.getBytes(StandardCharsets.UTF_8).length);
                    newFile.setFileType(sourceFile.getFileType());
                    newFile.setS3Url(newS3Url);
                    newFile.setUploadedBy(user);
                    projectFileRepository.save(newFile);
                }
            }
            case DELETE -> {
                if (fileStatus.getTargetFileId() != null) {
                    deleteTargetFile(fileStatus.getTargetFileId());
                }
            }
        }
    }

    private String handlePostMergeAction(String baseProject, String sourceBranch, String targetBranch,
                                          MergeExecuteRequest.PostMergeAction action, User user) {
        switch (action) {
            case DELETE_BRANCH -> {
                Project sourceProject = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, sourceBranch)
                        .orElseThrow(() -> new RuntimeException("Source branch not found"));
                sourceProject.setDeletedAt(LocalDateTime.now());
                projectRepository.save(sourceProject);

                // Delete S3 folder for the branch
                try {
                    String folderPrefix = baseProject + "/" + sourceBranch + "/";
                    minioService.deleteFolder(folderPrefix);
                } catch (Exception e) {
                    // Log but don't fail the merge if S3 cleanup fails
                    System.err.println("Warning: Failed to delete S3 folder for branch " + sourceBranch + ": " + e.getMessage());
                }

                return "Source branch '" + sourceBranch + "' has been deleted";
            }
            case RESET_BRANCH -> {
                // Delete source branch
                Project sourceProject = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, sourceBranch)
                        .orElseThrow(() -> new RuntimeException("Source branch not found"));
                sourceProject.setDeletedAt(LocalDateTime.now());
                projectRepository.save(sourceProject);

                // Delete S3 folder for the old branch
                try {
                    String folderPrefix = baseProject + "/" + sourceBranch + "/";
                    minioService.deleteFolder(folderPrefix);
                } catch (Exception e) {
                    System.err.println("Warning: Failed to delete S3 folder for branch " + sourceBranch + ": " + e.getMessage());
                }

                // Recreate source branch from target
                Project targetProject = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, targetBranch)
                        .orElseThrow(() -> new RuntimeException("Target branch not found"));

                Project newBranch = new Project();
                newBranch.setBaseProject(baseProject);
                newBranch.setBranch(sourceBranch);
                newBranch.setSourceBranch(targetBranch);
                newBranch.setName(targetProject.getName());
                newBranch.setOwner(targetProject.getOwner());
                Project savedBranch = projectRepository.save(newBranch);

                // Copy files from target to new branch
                List<ProjectFile> targetFiles = projectFileRepository.findByProjectIdNonDeleted(targetProject.getId());
                for (ProjectFile targetFile : targetFiles) {
                    try {
                        String content = getCurrentContentInternal(targetFile);
                        String destFolder = baseProject + "/" + sourceBranch + targetFile.getProjectFolder();
                        String newS3Url = minioService.uploadContent(content, destFolder,
                                targetFile.getFileName(), targetFile.getFileType());

                        ProjectFile newFile = new ProjectFile();
                        newFile.setProject(savedBranch);
                        newFile.setProjectFolder(targetFile.getProjectFolder());
                        newFile.setFileName(targetFile.getFileName());
                        newFile.setOriginalFileName(targetFile.getOriginalFileName());
                        newFile.setFileSize((long) content.getBytes(StandardCharsets.UTF_8).length);
                        newFile.setFileType(targetFile.getFileType());
                        newFile.setS3Url(newS3Url);
                        newFile.setUploadedBy(user);
                        projectFileRepository.save(newFile);
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to copy file during branch reset", e);
                    }
                }

                return "Source branch '" + sourceBranch + "' has been reset from target branch";
            }
            default -> {
                return "Unknown action";
            }
        }
    }

    // LCS computation for diff
    private int[][] computeLCS(List<String> a, List<String> b) {
        int m = a.size();
        int n = b.size();
        int[][] dp = new int[m + 1][n + 1];

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.get(i - 1).equals(b.get(j - 1))) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        return dp;
    }
}
