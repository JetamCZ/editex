package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPresenceMessage {
    private String fileId;
    private Long userId;
    private String userName;
    private PresenceStatus status;
    private Integer cursorPosition;
    private Integer currentLine;

    public enum PresenceStatus {
        JOINED,
        EDITING,
        IDLE,
        LEFT
    }
}
