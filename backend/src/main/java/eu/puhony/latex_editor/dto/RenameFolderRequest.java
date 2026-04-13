package eu.puhony.latex_editor.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RenameFolderRequest {
    @NotBlank
    private String name;
}
