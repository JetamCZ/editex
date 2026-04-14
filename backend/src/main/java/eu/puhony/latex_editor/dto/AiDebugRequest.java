package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiDebugRequest {
    private String baseProject;
    private String branch;
    private String sourceFile;
    private String errorMessage;
    private String compilationLog;
    private String language;
}
