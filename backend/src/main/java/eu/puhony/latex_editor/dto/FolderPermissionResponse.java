package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.FolderPermission;
import eu.puhony.latex_editor.entity.FolderRole;
import eu.puhony.latex_editor.service.FolderPermissionService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FolderPermissionResponse {
    private Long id;
    private Long folderId;
    private Long userId;
    private String userEmail;
    private String userName;
    private FolderRole role;
    private boolean inherited;
    private Long sourceFolderId;
    private String sourceFolderPath;
    private Long grantedById;
    private LocalDateTime createdAt;

    public static FolderPermissionResponse fromDirect(FolderPermission p) {
        FolderPermissionResponse r = new FolderPermissionResponse();
        r.id = p.getId();
        r.folderId = p.getFolder().getId();
        r.userId = p.getUser().getId();
        r.userEmail = p.getUser().getEmail();
        r.userName = p.getUser().getName();
        r.role = p.getRole();
        r.inherited = false;
        r.sourceFolderId = p.getFolder().getId();
        r.sourceFolderPath = p.getFolder().getPath();
        r.grantedById = p.getGrantedBy() != null ? p.getGrantedBy().getId() : null;
        r.createdAt = p.getCreatedAt();
        return r;
    }

    public static FolderPermissionResponse fromEffective(FolderPermissionService.EffectiveGrant eg, Long viewingFolderId) {
        FolderPermission p = eg.grant;
        FolderPermissionResponse r = fromDirect(p);
        r.folderId = viewingFolderId;
        r.inherited = eg.inherited;
        r.sourceFolderId = eg.source.getId();
        r.sourceFolderPath = eg.source.getPath();
        return r;
    }
}
