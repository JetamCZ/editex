package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentEditMessage {
    private String fileId;
    private String sessionId;
    private List<LineDelta> deltas;
    private Integer cursorPosition;
    private Integer currentLine;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineDelta {
        private Integer lineNumber;
        private DeltaType type;
        private String oldContent;
        private String newContent;
    }

    public enum DeltaType {
        INSERT,
        DELETE,
        MODIFY
    }
}
