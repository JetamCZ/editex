package eu.puhony.latex_editor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateBranchRequest {
    @NotBlank(message = "Branch name is required")
    @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "Branch name can only contain letters, numbers, underscores, and hyphens")
    private String branchName;

    private String sourceBranch = "main";
}
