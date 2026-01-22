package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.DocumentChange;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChangeResponse {
    private String id;
    private String fileId;
    private String fileName;
    private String filePath;
    private String userId;
    private String userName;
    private String operation;
    private Integer lineNumber;
    private String content;
    private LocalDateTime createdAt;

    public static DocumentChangeResponse from(DocumentChange change) {
        DocumentChangeResponse response = new DocumentChangeResponse();
        response.setId(change.getId());
        response.setFileId(change.getFile().getId());
        response.setFileName(change.getFile().getOriginalFileName());
        response.setFilePath(change.getFile().getProjectFolder() + "/" + change.getFile().getOriginalFileName());
        response.setUserId(change.getUser().getId().toString());
        response.setUserName(change.getUser().getName());
        response.setOperation(change.getOperation());
        response.setLineNumber(change.getLineNumber());
        response.setContent(change.getContent());
        response.setCreatedAt(change.getCreatedAt());
        return response;
    }
}
