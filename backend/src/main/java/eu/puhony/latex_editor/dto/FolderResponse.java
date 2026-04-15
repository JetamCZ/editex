package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.FolderRole;
import eu.puhony.latex_editor.entity.ProjectFolder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FolderResponse {
    private Long id;
    private Long projectId;
    private Long parentId;
    private String name;
    private String path;
    private FolderRole effectiveRole;
    private boolean hasExplicitGrants;
    private LocalDateTime createdAt;

    public static FolderResponse from(ProjectFolder folder, FolderRole effectiveRole, boolean hasExplicitGrants) {
        return new FolderResponse(
                folder.getId(),
                folder.getProject().getId(),
                folder.getParent() != null ? folder.getParent().getId() : null,
                folder.getName(),
                folder.getPath(),
                effectiveRole,
                hasExplicitGrants,
                folder.getCreatedAt()
        );
    }
}
