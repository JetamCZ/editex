package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompilationRequest {
    private String baseProject;  // The base project UUID
    private String branch = "main";  // The branch to compile (defaults to "main")
}
