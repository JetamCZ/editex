package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.FolderRole;
import eu.puhony.latex_editor.entity.Project;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectWithRoleResponse {
    private Long id;
    private String baseProject;
    private String name;
    private Long ownerId;
    private FolderRole userRole;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectWithRoleResponse from(Project project, FolderRole userRole) {
        ProjectWithRoleResponse response = new ProjectWithRoleResponse();
        response.setId(project.getId());
        response.setBaseProject(project.getBaseProject());
        response.setName(project.getName());
        response.setOwnerId(project.getOwner().getId());
        response.setUserRole(userRole);
        response.setCreatedAt(project.getCreatedAt());
        response.setUpdatedAt(project.getUpdatedAt());
        return response;
    }
}
