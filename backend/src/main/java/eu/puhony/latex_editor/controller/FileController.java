package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.FileUploadResponse;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.DocumentChangeService;
import eu.puhony.latex_editor.service.FileService;
import eu.puhony.latex_editor.service.MinioService;
import eu.puhony.latex_editor.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileService fileService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentChangeService documentChangeService;

    @Autowired
    private MinioService minioService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("baseProject") String baseProject,
            @RequestParam(value = "branch", defaultValue = "main") String branch,
            @RequestParam(value = "folder", defaultValue = "/files") String folder,
            Authentication authentication) {

        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Project project = projectService.getProjectByBaseProjectAndBranch(baseProject, branch, user.getId())
                    .orElseThrow(() -> new RuntimeException("Project not found"));

            ProjectFile uploadedFile = fileService.uploadFile(file, project, folder, user);

            FileUploadResponse response = mapToResponse(uploadedFile);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            throw new RuntimeException("Error uploading file: " + e.getMessage(), e);
        }
    }

    @GetMapping("/project/{baseProject}/{branch}")
    public ResponseEntity<List<FileUploadResponse>> getProjectFiles(
            @PathVariable String baseProject,
            @PathVariable String branch,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectService.getProjectByBaseProjectAndBranch(baseProject, branch, user.getId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        List<ProjectFile> files = fileService.getProjectFiles(project.getId(), baseProject, user.getId());
        List<FileUploadResponse> response = files.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{baseProject}/{branch}/folder")
    public ResponseEntity<List<FileUploadResponse>> getProjectFilesByFolder(
            @PathVariable String baseProject,
            @PathVariable String branch,
            @RequestParam String folder,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectService.getProjectByBaseProjectAndBranch(baseProject, branch, user.getId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        List<ProjectFile> files = fileService.getProjectFilesByFolder(project.getId(), baseProject, folder, user.getId());
        List<FileUploadResponse> response = files.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<FileUploadResponse> getFileById(
            @PathVariable String fileId,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return fileService.getFileById(fileId, user.getId())
                .map(this::mapToResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{fileId}/content")
    public ResponseEntity<FileContentResponse> getFileContent(
            @PathVariable String fileId,
            Authentication authentication) {

        if (authentication == null || authentication.getName() == null) {
            System.out.println("Authentication is null or has no name");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        System.out.println("Authenticated user: " + authentication.getName());

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return fileService.getFileById(fileId, user.getId())
                .map(file -> {
                    try {
                        // Fetch original content from S3
                        String originalContent = minioService.getFileContent(file.getS3Url());

                        // Get all changes for this file
                        List<DocumentChange> changes = documentChangeService.getFileChanges(file.getId(), user.getId());

                        // Apply changes to get the current content
                        String currentContent = documentChangeService.applyChangesToContent(originalContent, changes);

                        // Get last change ID
                        String lastChangeId = documentChangeService.getLatestChange(file.getId(), user.getId())
                                .map(eu.puhony.latex_editor.entity.DocumentChange::getId)
                                .orElse(null);

                        System.out.println("File content fetched - Original lines: " + originalContent.split("\n").length +
                                         ", Changes applied: " + changes.size() +
                                         ", Final lines: " + currentContent.split("\n").length);

                        FileContentResponse response = new FileContentResponse();
                        response.setContent(currentContent);
                        response.setLastChangeId(lastChangeId);
                        response.setFileType(file.getFileType());
                        response.setFileName(file.getOriginalFileName());

                        return ResponseEntity.ok(response);
                    } catch (Exception e) {
                        e.printStackTrace();
                        throw new RuntimeException("Error fetching file content", e);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DTO for file content response
    public static class FileContentResponse {
        private String content;
        private String lastChangeId;
        private String fileType;
        private String fileName;

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }

        public String getLastChangeId() {
            return lastChangeId;
        }

        public void setLastChangeId(String lastChangeId) {
            this.lastChangeId = lastChangeId;
        }

        public String getFileType() {
            return fileType;
        }

        public void setFileType(String fileType) {
            this.fileType = fileType;
        }

        public String getFileName() {
            return fileName;
        }

        public void setFileName(String fileName) {
            this.fileName = fileName;
        }
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> deleteFile(
            @PathVariable String fileId,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean deleted = fileService.deleteFile(fileId, user.getId());
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    private FileUploadResponse mapToResponse(ProjectFile file) {
        User currentUser = userRepository.findByEmail(
                SecurityContextHolder.getContext().getAuthentication().getName()
        ).orElse(null);

        String lastChangeId = null;
        if (currentUser != null) {
            lastChangeId = documentChangeService.getLatestChange(file.getId(), currentUser.getId())
                    .map(eu.puhony.latex_editor.entity.DocumentChange::getId)
                    .orElse(null);
        }

        return new FileUploadResponse(
                file.getId(),
                file.getProject().getBaseProject(),
                file.getProjectFolder(),
                file.getFileName(),
                file.getOriginalFileName(),
                file.getFileSize(),
                file.getFileType(),
                file.getS3Url(),
                file.getUploadedBy().getId(),
                file.getCreatedAt(),
                lastChangeId
        );
    }
}
