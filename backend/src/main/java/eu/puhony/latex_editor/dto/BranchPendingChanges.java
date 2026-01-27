package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BranchPendingChanges {
    private String branch;
    private boolean hasPendingChanges;
    private Long lastCommitChangeId;         // Last change ID from the most recent COMMIT
    private Long currentChangeId;            // Actual latest change ID in the branch
    private LocalDateTime lastChangeAt;      // When the last change was made
    private int pendingChangeCount;          // Approximate count of pending changes
}
