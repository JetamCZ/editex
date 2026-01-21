package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.Project;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BranchResponse {
    private Long id;
    private String baseProject;
    private String branch;
    private String sourceBranch;
    private String name;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static BranchResponse from(Project project) {
        BranchResponse response = new BranchResponse();
        response.setId(project.getId());
        response.setBaseProject(project.getBaseProject());
        response.setBranch(project.getBranch());
        response.setSourceBranch(project.getSourceBranch());
        response.setName(project.getName());
        response.setCreatedAt(project.getCreatedAt());
        response.setUpdatedAt(project.getUpdatedAt());
        return response;
    }
}
