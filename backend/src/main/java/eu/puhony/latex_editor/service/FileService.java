package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
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

    @Transactional
    public ProjectFile uploadFile(MultipartFile file, Project project, String folder, User uploadedBy) throws Exception {
        projectMemberService.ensureCanEdit(project.getBaseProject(), uploadedBy.getId());

        String s3Url = minioService.uploadFile(file, project.getBaseProject() + "/" + project.getBranch() + folder);

        ProjectFile projectFile = new ProjectFile();
        projectFile.setProject(project);
        projectFile.setProjectFolder(folder);
        projectFile.setFileName(file.getOriginalFilename());
        projectFile.setOriginalFileName(file.getOriginalFilename());
        projectFile.setFileSize(file.getSize());
        projectFile.setFileType(file.getContentType());
        projectFile.setS3Url(s3Url);
        projectFile.setUploadedBy(uploadedBy);

        return fileRepository.save(projectFile);
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

        return fileRepository.save(projectFile);
    }
}
