package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiDebugRequest {
    private Long projectId;
    private String sourceFile;
    private String errorMessage;
    private String compilationLog;
    private String language;
}
