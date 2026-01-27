package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.Commit;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommitResponse {
    private String id;
    private String baseProject;
    private String branch;
    private String type;
    private String sourceBranch;
    private String targetBranch;
    private String message;
    private Long lastChangeId;
    private String author;
    private Long authorId;
    private LocalDateTime createdAt;

    public static CommitResponse from(Commit commit) {
        CommitResponse response = new CommitResponse();
        response.setId(commit.getId());
        response.setBaseProject(commit.getBaseProject());
        response.setBranch(commit.getBranch());
        response.setType(commit.getType().name());
        response.setSourceBranch(commit.getSourceBranch());
        response.setTargetBranch(commit.getTargetBranch());
        response.setMessage(commit.getMessage());
        response.setLastChangeId(commit.getLastChangeId());
        if (commit.getCreatedBy() != null) {
            response.setAuthor(commit.getCreatedBy().getName());
            response.setAuthorId(commit.getCreatedBy().getId());
        }
        response.setCreatedAt(commit.getCreatedAt());
        return response;
    }
}
