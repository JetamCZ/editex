package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.FileBranch;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.ProjectFolder;
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
    private final FolderPermissionService folderPermissionService;
    private final ProjectFolderService projectFolderService;
    private final FileBranchRepository branchRepository;

    private static final String SOURCES_ROOT = "/sources";

    @Transactional
    public ProjectFile uploadFile(MultipartFile file, Project project, String folderPath, User uploadedBy) throws Exception {
        String normalizedFolder = ProjectFolderService.normalize(folderPath);
        ProjectFolder targetFolder = projectFolderService.getOrCreateByPath(project.getBaseProject(), normalizedFolder);

        // EDITOR+ required on the target folder.
        folderPermissionService.ensureCanEdit(uploadedBy.getId(), targetFolder);

        String s3Path = project.getBaseProject() + "/" + project.getBranch() + SOURCES_ROOT + normalizedFolder;
        String s3Url = minioService.uploadFile(file, s3Path);

        ProjectFile projectFile = new ProjectFile();
        projectFile.setProject(project);
        projectFile.setProjectFolder(normalizedFolder);
        projectFile.setFolder(targetFolder);
        projectFile.setFileName(file.getOriginalFilename());
        projectFile.setOriginalFileName(file.getOriginalFilename());
        projectFile.setFileSize(file.getSize());
        projectFile.setFileType(file.getContentType());
        projectFile.setS3Url(s3Url);
        projectFile.setUploadedBy(uploadedBy);

        projectFile = fileRepository.save(projectFile);

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
        folderPermissionService.ensureCanReadProject(baseProject, userId);
        // Hide files inside folders the user cannot read.
        return fileRepository.findByProjectIdNonDeleted(projectId).stream()
                .filter(f -> folderPermissionService.canRead(userId, f))
                .toList();
    }

    public List<ProjectFile> getProjectFilesByFolder(Long projectId, String baseProject, String folder, Long userId) {
        folderPermissionService.ensureCanReadProject(baseProject, userId);
        String normalized = ProjectFolderService.normalize(folder);
        ProjectFolder target = projectFolderService.getByPath(baseProject, normalized);
        folderPermissionService.ensureCanRead(userId, target);
        return fileRepository.findByProjectIdAndFolderNonDeleted(projectId, normalized);
    }

    public Optional<ProjectFile> getFileById(String fileId, Long userId) {
        Optional<ProjectFile> file = fileRepository.findByIdNonDeleted(fileId);
        file.ifPresent(f -> folderPermissionService.ensureCanRead(userId, f));
        return file;
    }

    @Transactional
    public boolean deleteFile(String fileId, Long userId) {
        return fileRepository.findByIdNonDeleted(fileId)
                .map(file -> {
                    folderPermissionService.ensureCanEdit(userId, file);
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
    public ProjectFile moveFile(String fileId, String targetFolderPath, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        // EDITOR required on source AND destination.
        folderPermissionService.ensureCanEdit(userId, file);

        String normalizedFolder = ProjectFolderService.normalize(targetFolderPath);
        String currentFolder = file.getProjectFolder();
        if (currentFolder.equals(normalizedFolder)) {
            return file;
        }

        ProjectFolder destFolder = projectFolderService.getOrCreateByPath(
                file.getProject().getBaseProject(), normalizedFolder);
        folderPermissionService.ensureCanEdit(userId, destFolder);

        try {
            String currentObjectName = minioService.getObjectNameFromUrl(file.getS3Url());
            if (currentObjectName == null) {
                throw new RuntimeException("Could not extract object name from URL");
            }

            String baseProject = file.getProject().getBaseProject();
            String branch = file.getProject().getBranch();
            String newS3Path = baseProject + "/" + branch + SOURCES_ROOT + normalizedFolder;

            String newS3Url = minioService.copyFile(currentObjectName, newS3Path, file.getFileName());
            minioService.deleteFile(currentObjectName);

            file.setProjectFolder(normalizedFolder);
            file.setFolder(destFolder);
            file.setS3Url(newS3Url);
            return fileRepository.save(file);
        } catch (Exception e) {
            throw new RuntimeException("Error moving file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public ProjectFile saveGeneratedPdf(File pdfFile, Project project,
                                        String sourceFileId, User user) throws Exception {
        String s3Url = minioService.uploadFile(pdfFile,
                project.getBaseProject() + "/" + project.getBranch() + "/compiled",
                "application/pdf");

        ProjectFolder compiledFolder = projectFolderService.getOrCreateByPath(project.getBaseProject(), "/compiled");

        ProjectFile projectFile = new ProjectFile();
        projectFile.setProject(project);
        projectFile.setProjectFolder("/compiled");
        projectFile.setFolder(compiledFolder);
        projectFile.setFileName(pdfFile.getName());
        projectFile.setOriginalFileName(pdfFile.getName());
        projectFile.setFileSize(pdfFile.length());
        projectFile.setFileType("application/pdf");
        projectFile.setS3Url(s3Url);
        projectFile.setUploadedBy(user);

        projectFile = fileRepository.save(projectFile);

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
