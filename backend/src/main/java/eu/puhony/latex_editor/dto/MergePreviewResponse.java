package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MergePreviewResponse {
    private String sourceBranch;
    private String targetBranch;
    private boolean canMerge;
    private String validationError;

    private List<FileMergeStatus> files;

    // Summary counts
    private int addedCount;
    private int modifiedCount;
    private int deletedCount;
    private int conflictCount;
    private int unchangedCount;

    public boolean hasConflicts() {
        return conflictCount > 0;
    }

    public static MergePreviewResponse error(String sourceBranch, String targetBranch, String error) {
        MergePreviewResponse response = new MergePreviewResponse();
        response.setSourceBranch(sourceBranch);
        response.setTargetBranch(targetBranch);
        response.setCanMerge(false);
        response.setValidationError(error);
        return response;
    }
}
