package eu.puhony.latex_editor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MergeExecuteRequest {

    public enum PostMergeAction {
        DELETE_BRANCH,  // Soft-delete source branch after merge
        RESET_BRANCH    // Delete source branch, then recreate it from target
    }

    @NotBlank(message = "Source branch is required")
    private String sourceBranch;

    @NotBlank(message = "Target branch is required")
    private String targetBranch;

    // Resolutions for conflicted files
    private List<ResolvedFile> resolvedFiles;

    @NotNull(message = "Post-merge action is required")
    private PostMergeAction postMergeAction;

    // Optional commit message for the merge
    private String commitMessage;
}
