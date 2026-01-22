package eu.puhony.latex_editor.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoveFileRequest {
    @NotBlank(message = "Target folder is required")
    private String targetFolder;
}
