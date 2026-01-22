package eu.puhony.latex_editor.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MergePreviewRequest {
    @NotBlank(message = "Source branch is required")
    private String sourceBranch;

    @NotBlank(message = "Target branch is required")
    private String targetBranch;
}
