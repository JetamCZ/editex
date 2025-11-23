package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectMember;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectWithRoleResponse {
    private String id;
    private String name;
    private Long ownerId;
    private ProjectMember.Role userRole;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectWithRoleResponse from(Project project, ProjectMember.Role userRole) {
        ProjectWithRoleResponse response = new ProjectWithRoleResponse();
        response.setId(project.getId());
        response.setName(project.getName());
        response.setOwnerId(project.getOwner().getId());
        response.setUserRole(userRole);
        response.setCreatedAt(project.getCreatedAt());
        response.setUpdatedAt(project.getUpdatedAt());
        return response;
    }
}
