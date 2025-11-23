package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class FileService {

    @Autowired
    private ProjectFileRepository fileRepository;

    @Autowired
    private MinioService minioService;

    @Transactional
    public ProjectFile uploadFile(MultipartFile file, Project project, String folder, User uploadedBy) throws Exception {
        String s3Url = minioService.uploadFile(file, project.getId() + folder);

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

    public List<ProjectFile> getProjectFiles(String projectId) {
        return fileRepository.findByProjectIdNonDeleted(projectId);
    }

    public List<ProjectFile> getProjectFilesByFolder(String projectId, String folder) {
        return fileRepository.findByProjectIdAndFolderNonDeleted(projectId, folder);
    }

    public Optional<ProjectFile> getFileById(String fileId) {
        return fileRepository.findByIdNonDeleted(fileId);
    }

    @Transactional
    public boolean deleteFile(String fileId) {
        return fileRepository.findByIdNonDeleted(fileId)
                .map(file -> {
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
}
