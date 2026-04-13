package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.FolderRole;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GrantPermissionRequest {
    private String email;
    private Long userId;

    @NotNull
    private FolderRole role;
}
