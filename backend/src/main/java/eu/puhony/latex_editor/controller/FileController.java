package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.FileUploadResponse;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.FileService;
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

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileUploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectId") String projectId,
            @RequestParam(value = "folder", defaultValue = "/files") String folder) {

        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Project project = projectService.getProjectById(projectId)
                    .orElseThrow(() -> new RuntimeException("Project not found"));

            ProjectFile uploadedFile = fileService.uploadFile(file, project, folder, user);

            FileUploadResponse response = mapToResponse(uploadedFile);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            throw new RuntimeException("Error uploading file: " + e.getMessage(), e);
        }
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<FileUploadResponse>> getProjectFiles(@PathVariable String projectId) {
        List<ProjectFile> files = fileService.getProjectFiles(projectId);
        List<FileUploadResponse> response = files.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{projectId}/folder")
    public ResponseEntity<List<FileUploadResponse>> getProjectFilesByFolder(
            @PathVariable String projectId,
            @RequestParam String folder) {
        List<ProjectFile> files = fileService.getProjectFilesByFolder(projectId, folder);
        List<FileUploadResponse> response = files.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<FileUploadResponse> getFileById(@PathVariable String fileId) {
        return fileService.getFileById(fileId)
                .map(this::mapToResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> deleteFile(@PathVariable String fileId) {
        boolean deleted = fileService.deleteFile(fileId);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    private FileUploadResponse mapToResponse(ProjectFile file) {
        return new FileUploadResponse(
                file.getId(),
                file.getProject().getId(),
                file.getProjectFolder(),
                file.getFileName(),
                file.getOriginalFileName(),
                file.getFileSize(),
                file.getFileType(),
                file.getS3Url(),
                file.getUploadedBy().getId(),
                file.getCreatedAt()
        );
    }
}
