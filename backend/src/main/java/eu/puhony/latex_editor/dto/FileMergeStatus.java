package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileMergeStatus {

    public enum Status {
        ADDED,      // File only exists in source branch (will be copied to target)
        MODIFIED,   // File exists in both, content differs but no conflicts
        DELETED,    // File deleted in source (will be deleted from target)
        CONFLICT,   // File modified in both branches with conflicting changes
        UNCHANGED   // File is identical in both branches
    }

    private String fileId;
    private String filePath;
    private String fileName;
    private Status status;
    private boolean isTextFile;
    private List<LineConflict> conflicts;

    // For binary file conflicts - user must pick source or target
    private boolean isBinaryConflict;

    // Source file info (null if file doesn't exist in source)
    private String sourceFileId;
    private Long sourceFileSize;

    // Target file info (null if file doesn't exist in target)
    private String targetFileId;
    private Long targetFileSize;

    // Auto-merged content (when status is MODIFIED and can be auto-merged)
    private String autoMergedContent;
}
