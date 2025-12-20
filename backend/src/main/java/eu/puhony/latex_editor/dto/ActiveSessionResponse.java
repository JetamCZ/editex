package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActiveSessionResponse {
    private String sessionId;
    private String fileId;
    private Long userId;
    private String userName;
    private Integer cursorPosition;
    private Integer currentLine;
    private LocalDateTime connectedAt;
}
