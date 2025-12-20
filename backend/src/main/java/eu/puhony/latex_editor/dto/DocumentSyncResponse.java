package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentSyncResponse {
    private String fileId;
    private String sessionId;
    private Long userId;
    private String userName;
    private List<DocumentEditMessage.LineDelta> deltas;
    private Integer cursorPosition;
    private Integer currentLine;
    private LocalDateTime timestamp;
    private SyncStatus status;

    public enum SyncStatus {
        SUCCESS,
        CONFLICT,
        ERROR
    }
}
