package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupedChangeResponse {
    private String fileId;
    private String fileName;
    private String filePath;
    private String userId;
    private String userName;
    private String sessionId;
    private int changeCount;
    private int linesModified;
    private int linesInserted;
    private int linesDeleted;
    private LocalDateTime firstChangeAt;
    private LocalDateTime lastChangeAt;
}
