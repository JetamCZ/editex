package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.dto.*;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
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
                        // Update target file with source content
                        updateTargetFile(baseProject, targetBranch, targetProject,
                                fileStatus.getSourceFileId(), fileStatus.getTargetFileId(),
                                fileStatus.getFilePath(), user);
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
     * Detect line conflicts between two versions of a text file using LCS-based diff.
     */
    public List<LineConflict> detectLineConflicts(String sourceContent, String targetContent) {
        List<String> sourceLines = Arrays.asList(sourceContent.split("\n", -1));
        List<String> targetLines = Arrays.asList(targetContent.split("\n", -1));

        // Use LCS to find common subsequence
        int[][] lcs = computeLCS(sourceLines, targetLines);

        // Backtrack to find differences
        List<LineConflict> conflicts = new ArrayList<>();
        int i = sourceLines.size();
        int j = targetLines.size();

        List<DiffRegion> diffRegions = new ArrayList<>();

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && sourceLines.get(i - 1).equals(targetLines.get(j - 1))) {
                i--;
                j--;
            } else if (j > 0 && (i == 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
                // Line added in target
                diffRegions.add(new DiffRegion(i, i, j - 1, j, DiffType.TARGET_ONLY));
                j--;
            } else if (i > 0) {
                // Line added in source
                diffRegions.add(new DiffRegion(i - 1, i, j, j, DiffType.SOURCE_ONLY));
                i--;
            }
        }

        // Merge adjacent diff regions into conflicts
        Collections.reverse(diffRegions);
        conflicts = mergeIntoConflicts(diffRegions, sourceLines, targetLines);

        return conflicts;
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

        // File in both branches - compare content
        try {
            String sourceContent = getCurrentContentInternal(sourceFile);
            String targetContent = getCurrentContentInternal(targetFile);

            if (sourceContent.equals(targetContent)) {
                status.setStatus(FileMergeStatus.Status.UNCHANGED);
                return status;
            }

            // Content differs
            if (status.isTextFile()) {
                // For text files, detect line-level conflicts
                List<LineConflict> conflicts = detectLineConflicts(sourceContent, targetContent);
                if (conflicts.isEmpty()) {
                    // No conflicts - can auto-merge
                    status.setStatus(FileMergeStatus.Status.MODIFIED);
                } else {
                    status.setStatus(FileMergeStatus.Status.CONFLICT);
                    status.setConflicts(conflicts);
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
                return "Source branch '" + sourceBranch + "' has been deleted";
            }
            case RESET_BRANCH -> {
                // Delete source branch
                Project sourceProject = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, sourceBranch)
                        .orElseThrow(() -> new RuntimeException("Source branch not found"));
                sourceProject.setDeletedAt(LocalDateTime.now());
                projectRepository.save(sourceProject);

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

    private enum DiffType {
        SOURCE_ONLY, TARGET_ONLY
    }

    private record DiffRegion(int sourceStart, int sourceEnd, int targetStart, int targetEnd, DiffType type) {}

    private List<LineConflict> mergeIntoConflicts(List<DiffRegion> regions, List<String> sourceLines, List<String> targetLines) {
        if (regions.isEmpty()) {
            return Collections.emptyList();
        }

        List<LineConflict> conflicts = new ArrayList<>();
        List<DiffRegion> currentGroup = new ArrayList<>();

        for (DiffRegion region : regions) {
            if (currentGroup.isEmpty()) {
                currentGroup.add(region);
            } else {
                DiffRegion last = currentGroup.get(currentGroup.size() - 1);
                // If regions are adjacent or overlapping, group them
                if (region.sourceStart <= last.sourceEnd + 1 && region.targetStart <= last.targetEnd + 1) {
                    currentGroup.add(region);
                } else {
                    // Create conflict from current group
                    conflicts.add(createConflictFromGroup(currentGroup, sourceLines, targetLines));
                    currentGroup.clear();
                    currentGroup.add(region);
                }
            }
        }

        // Handle remaining group
        if (!currentGroup.isEmpty()) {
            conflicts.add(createConflictFromGroup(currentGroup, sourceLines, targetLines));
        }

        return conflicts;
    }

    private LineConflict createConflictFromGroup(List<DiffRegion> group, List<String> sourceLines, List<String> targetLines) {
        int sourceStart = group.stream().mapToInt(DiffRegion::sourceStart).min().orElse(0);
        int sourceEnd = group.stream().mapToInt(DiffRegion::sourceEnd).max().orElse(0);
        int targetStart = group.stream().mapToInt(DiffRegion::targetStart).min().orElse(0);
        int targetEnd = group.stream().mapToInt(DiffRegion::targetEnd).max().orElse(0);

        List<String> sourceConflictLines = sourceStart < sourceEnd && sourceEnd <= sourceLines.size()
                ? sourceLines.subList(sourceStart, sourceEnd)
                : Collections.emptyList();
        List<String> targetConflictLines = targetStart < targetEnd && targetEnd <= targetLines.size()
                ? targetLines.subList(targetStart, targetEnd)
                : Collections.emptyList();

        LineConflict conflict = new LineConflict();
        conflict.setStartLine(sourceStart + 1); // 1-based
        conflict.setEndLine(sourceEnd);
        conflict.setSourceLines(new ArrayList<>(sourceConflictLines));
        conflict.setTargetLines(new ArrayList<>(targetConflictLines));
        conflict.setContextStartLine(Math.max(1, sourceStart - 2));
        conflict.setContextEndLine(Math.min(sourceLines.size(), sourceEnd + 2));

        return conflict;
    }
}
