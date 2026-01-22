package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MergeExecuteResponse {
    private boolean success;
    private String message;
    private LocalDateTime mergedAt;

    // Summary of changes applied
    private int filesAdded;
    private int filesModified;
    private int filesDeleted;

    // Post-merge action result
    private String postMergeActionResult;

    // If branch was reset, this is the new branch info
    private String newBranchId;

    public static MergeExecuteResponse success(int added, int modified, int deleted, String postActionResult) {
        MergeExecuteResponse response = new MergeExecuteResponse();
        response.setSuccess(true);
        response.setMessage("Merge completed successfully");
        response.setMergedAt(LocalDateTime.now());
        response.setFilesAdded(added);
        response.setFilesModified(modified);
        response.setFilesDeleted(deleted);
        response.setPostMergeActionResult(postActionResult);
        return response;
    }

    public static MergeExecuteResponse error(String message) {
        MergeExecuteResponse response = new MergeExecuteResponse();
        response.setSuccess(false);
        response.setMessage(message);
        return response;
    }
}
