package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.FileBranch;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.FileBranchRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FileService {

    private final ProjectFileRepository fileRepository;
    private final MinioService minioService;
    private final ProjectMemberService projectMemberService;
    private final FileBranchRepository branchRepository;

    private static final String SOURCES_ROOT = "/sources";

    @Transactional
    public ProjectFile uploadFile(MultipartFile file, Project project, String folder, User uploadedBy) throws Exception {
        projectMemberService.ensureCanEdit(project.getBaseProject(), uploadedBy.getId());

        // Validate and normalize folder path
        String normalizedFolder = validateAndNormalizeFolder(folder);

        // S3 path: {baseProject}/{branch}/sources{folder}
        String s3Path = project.getBaseProject() + "/" + project.getBranch() + SOURCES_ROOT + normalizedFolder;
        String s3Url = minioService.uploadFile(file, s3Path);

        ProjectFile projectFile = new ProjectFile();
        projectFile.setProject(project);
        projectFile.setProjectFolder(normalizedFolder);
        projectFile.setFileName(file.getOriginalFilename());
        projectFile.setOriginalFileName(file.getOriginalFilename());
        projectFile.setFileSize(file.getSize());
        projectFile.setFileType(file.getContentType());
        projectFile.setS3Url(s3Url);
        projectFile.setUploadedBy(uploadedBy);

        projectFile = fileRepository.save(projectFile);

        // Auto-create "main" branch for the new file
        FileBranch mainBranch = new FileBranch();
        mainBranch.setFile(projectFile);
        mainBranch.setName("main");
        mainBranch.setCreatedBy(uploadedBy);
        mainBranch = branchRepository.save(mainBranch);

        projectFile.setActiveBranch(mainBranch);
        projectFile = fileRepository.save(projectFile);

        return projectFile;
    }

    public List<ProjectFile> getProjectFiles(Long projectId, String baseProject, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);
        return fileRepository.findByProjectIdNonDeleted(projectId);
    }

    public List<ProjectFile> getProjectFilesByFolder(Long projectId, String baseProject, String folder, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);
        return fileRepository.findByProjectIdAndFolderNonDeleted(projectId, folder);
    }

    public Optional<ProjectFile> getFileById(String fileId, Long userId) {
        Optional<ProjectFile> file = fileRepository.findByIdNonDeleted(fileId);
        if (file.isPresent()) {
            projectMemberService.ensureCanRead(file.get().getProject().getBaseProject(), userId);
        }
        return file;
    }

    @Transactional
    public boolean deleteFile(String fileId, Long userId) {
        return fileRepository.findByIdNonDeleted(fileId)
                .map(file -> {
                    projectMemberService.ensureCanEdit(file.getProject().getBaseProject(), userId);

                    try {
                        String objectName = minioService.getObjectNameFromUrl(file.getS3Url());
                        if (objectName != null) {
                            minioService.deleteFile(objectName);
                        }
                        file.setDeletedAt(LocalDateTime.now());
                        fileRepository.save(file);
                        return true;
                    } catch (Exception e) {
                        throw new RuntimeException("Error deleting file", e);
                    }
                })
                .orElse(false);
    }

    @Transactional
    public ProjectFile moveFile(String fileId, String targetFolder, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanEdit(file.getProject().getBaseProject(), userId);

        // Validate and normalize target folder
        String normalizedFolder = validateAndNormalizeFolder(targetFolder);

        String currentFolder = file.getProjectFolder();

        // Don't move if already in the target folder
        if (currentFolder.equals(normalizedFolder)) {
            return file;
        }

        try {
            // Get the current S3 object name
            String currentObjectName = minioService.getObjectNameFromUrl(file.getS3Url());
            if (currentObjectName == null) {
                throw new RuntimeException("Could not extract object name from URL");
            }

            // Build new S3 path: {baseProject}/{branch}/sources{folder}
            String baseProject = file.getProject().getBaseProject();
            String branch = file.getProject().getBranch();
            String newS3Path = baseProject + "/" + branch + SOURCES_ROOT + normalizedFolder;

            // Copy file to new location
            String newS3Url = minioService.copyFile(currentObjectName, newS3Path, file.getFileName());

            // Delete old file from S3
            minioService.deleteFile(currentObjectName);

            // Update the database record
            file.setProjectFolder(normalizedFolder);
            file.setS3Url(newS3Url);

            return fileRepository.save(file);
        } catch (Exception e) {
            throw new RuntimeException("Error moving file: " + e.getMessage(), e);
        }
    }

    /**
     * Validates and normalizes a folder path.
     * - Must start with /
     * - Cannot contain path traversal (..)
     * - Trailing slashes are removed (except for root /)
     */
    private String validateAndNormalizeFolder(String folder) {
        if (folder == null || folder.isEmpty()) {
            return "/";
        }

        // Ensure it starts with /
        String normalized = folder.startsWith("/") ? folder : "/" + folder;

        // Remove trailing slashes (except for root)
        while (normalized.length() > 1 && normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        // Check for path traversal attempts
        if (normalized.contains("..")) {
            throw new IllegalArgumentException("Invalid folder path: path traversal not allowed");
        }

        return normalized;
    }

    @Transactional
    public ProjectFile saveGeneratedPdf(File pdfFile, Project project,
                                        String sourceFileId, User user) throws Exception {
        String s3Url = minioService.uploadFile(pdfFile,
                project.getBaseProject() + "/" + project.getBranch() + "/compiled",
                "application/pdf");

        ProjectFile projectFile = new ProjectFile();
        projectFile.setProject(project);
        projectFile.setProjectFolder("/compiled");
        projectFile.setFileName(pdfFile.getName());
        projectFile.setOriginalFileName(pdfFile.getName());
        projectFile.setFileSize(pdfFile.length());
        projectFile.setFileType("application/pdf");
        projectFile.setS3Url(s3Url);
        projectFile.setUploadedBy(user);

        projectFile = fileRepository.save(projectFile);

        // Auto-create "main" branch
        FileBranch mainBranch = new FileBranch();
        mainBranch.setFile(projectFile);
        mainBranch.setName("main");
        mainBranch.setCreatedBy(user);
        mainBranch = branchRepository.save(mainBranch);

        projectFile.setActiveBranch(mainBranch);
        projectFile = fileRepository.save(projectFile);

        return projectFile;
    }
}
