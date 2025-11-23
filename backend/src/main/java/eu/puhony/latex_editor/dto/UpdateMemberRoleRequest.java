package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.ProjectMember;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateMemberRoleRequest {
    @NotNull(message = "Role is required")
    private ProjectMember.Role role;
}
