package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiDebugResult {
    private boolean success;
    private String explanation;
    private String errorMessage;
    private String model;
}
