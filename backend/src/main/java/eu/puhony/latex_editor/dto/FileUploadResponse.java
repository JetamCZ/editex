package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {
    private String id;
    private String projectId;
    private String projectFolder;
    private String fileName;
    private String originalFileName;
    private Long fileSize;
    private String fileType;
    private String s3Url;
    private Long uploadedBy;
    private LocalDateTime createdAt;
    private Long lastChangeId;
    private String activeBranchId;
    private String activeBranchName;
}
