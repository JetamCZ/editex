package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.DocumentSyncService;
import eu.puhony.latex_editor.service.FileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URL;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Slf4j
public class DocumentContentController {

    private final DocumentSyncService documentSyncService;
    private final UserRepository userRepository;
    private final FileService fileService;

    /**
     * Get document content with all changes applied
     * GET /api/documents/{fileId}/content
     */
    @GetMapping("/{fileId}/content")
    public ResponseEntity<DocumentContentResponse> getDocumentContent(
        @PathVariable String fileId,
        Authentication authentication
    ) {
        try {
            // Verify user is authenticated
            User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

            log.info("Loading document content for file {} by user {}", fileId, user.getId());

            // Get the file metadata
            ProjectFile file = fileService.getFileById(fileId, user.getId())
                .orElse(null);
            if (file == null) {
                return ResponseEntity.notFound().build();
            }

            // Load original content from S3
            String originalContent = loadContentFromS3(file.getS3Url());

            // Apply all document changes
            String currentContent = documentSyncService.applyAllChanges(fileId, originalContent);

            DocumentContentResponse response = new DocumentContentResponse(
                fileId,
                file.getOriginalFileName(),
                file.getFileType(),
                currentContent
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error loading document content for file {}: {}", fileId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    private String loadContentFromS3(String s3Url) {
        try {
            URL url = new URL(s3Url);
            try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(url.openStream()))) {
                return reader.lines().collect(Collectors.joining("\n"));
            }
        } catch (Exception e) {
            log.error("Error loading content from S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to load file content", e);
        }
    }

    public static class DocumentContentResponse {
        private String fileId;
        private String fileName;
        private String fileType;
        private String content;

        public DocumentContentResponse(String fileId, String fileName, String fileType, String content) {
            this.fileId = fileId;
            this.fileName = fileName;
            this.fileType = fileType;
            this.content = content;
        }

        // Getters
        public String getFileId() {
            return fileId;
        }

        public String getFileName() {
            return fileName;
        }

        public String getFileType() {
            return fileType;
        }

        public String getContent() {
            return content;
        }
    }
}
