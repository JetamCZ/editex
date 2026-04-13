package eu.puhony.latex_editor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateFolderRequest {
    @NotNull
    private Long parentId;

    @NotBlank
    private String name;
}
