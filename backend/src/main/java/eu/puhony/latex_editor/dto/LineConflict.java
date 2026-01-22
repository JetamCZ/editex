package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LineConflict {
    private int startLine;
    private int endLine;
    private List<String> sourceLines;
    private List<String> targetLines;

    // Context around the conflict for display
    private int contextStartLine;
    private int contextEndLine;
}
