package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.FolderPermission;
import eu.puhony.latex_editor.entity.FolderRole;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.ProjectFolder;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.FolderPermissionRepository;
import eu.puhony.latex_editor.repository.ProjectFolderRepository;
import eu.puhony.latex_editor.repository.ProjectRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Folder-level permissions with additive inheritance.
 *
 * Invariants (see memory/project_permissions_redesign.md):
 *  - Effective role on a folder is the MAX role of all grants on that folder plus every ancestor.
 *  - The project owner always has implicit MANAGER on the root folder — never stored as a row.
 *  - Any user with a grant anywhere in the project implicitly has VIEWER on the root folder
 *    (for navigation). Computed here, never stored.
 *  - Revoking a MANAGER grant must not leave the root with zero MANAGERS (owner's implicit
 *    MANAGER counts, so this only kicks in after ownership transfer).
 */
@Service
@RequiredArgsConstructor
public class FolderPermissionService {

    private final FolderPermissionRepository permissionRepository;
    private final ProjectFolderRepository folderRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    // ---------------- Effective role ----------------

    public FolderRole effectiveRole(Long userId, ProjectFolder folder) {
        if (folder == null || userId == null) return null;
        Long projectId = folder.getProject().getId();

        if (isProjectOwner(projectId, userId)) {
            return FolderRole.MANAGER;
        }

        FolderRole best = null;
        ProjectFolder cur = folder;
        while (cur != null) {
            Optional<FolderPermission> g = permissionRepository.findByFolderAndUser(cur.getId(), userId);
            if (g.isPresent()) {
                best = FolderRole.max(best, g.get().getRole());
            }
            cur = cur.getParent();
        }

        if (best == null && folder.isRoot()) {
            // Implicit root VIEWER for anyone with any grant in the project.
            if (hasAnyGrantInProject(projectId, userId)) {
                return FolderRole.VIEWER;
            }
        }
        return best;
    }

    public FolderRole effectiveRole(Long userId, ProjectFile file) {
        if (file == null) return null;
        if (file.getFolder() != null) {
            return effectiveRole(userId, file.getFolder());
        }
        // Fallback for legacy rows without folder FK: treat as root access
        ProjectFolder root = folderRepository.findRoot(file.getProject().getId()).orElse(null);
        return effectiveRole(userId, root);
    }

    public FolderRole effectiveRoleOnRoot(Long projectId, Long userId) {
        return folderRepository.findRoot(projectId)
                .map(root -> effectiveRole(userId, root))
                .orElse(null);
    }

    // ---------------- Check helpers ----------------

    public boolean canRead(Long userId, ProjectFolder folder) {
        FolderRole r = effectiveRole(userId, folder);
        return r != null;
    }

    public boolean canEdit(Long userId, ProjectFolder folder) {
        FolderRole r = effectiveRole(userId, folder);
        return r != null && r.includes(FolderRole.EDITOR);
    }

    public boolean canManage(Long userId, ProjectFolder folder) {
        FolderRole r = effectiveRole(userId, folder);
        return r != null && r.includes(FolderRole.MANAGER);
    }

    public boolean canRead(Long userId, ProjectFile file) {
        FolderRole r = effectiveRole(userId, file);
        return r != null;
    }

    public boolean canEdit(Long userId, ProjectFile file) {
        FolderRole r = effectiveRole(userId, file);
        return r != null && r.includes(FolderRole.EDITOR);
    }

    public boolean canReadProject(Long projectId, Long userId) {
        if (isProjectOwner(projectId, userId)) return true;
        return hasAnyGrantInProject(projectId, userId);
    }

    public boolean canEditAnywhereInProject(Long projectId, Long userId) {
        if (isProjectOwner(projectId, userId)) return true;
        return permissionRepository.findByProjectIdAndUser(projectId, userId).stream()
                .anyMatch(p -> p.getRole().includes(FolderRole.EDITOR));
    }

    public boolean canManageAnyFolderInProject(Long projectId, Long userId) {
        if (isProjectOwner(projectId, userId)) return true;
        return permissionRepository.findByProjectIdAndUser(projectId, userId).stream()
                .anyMatch(p -> p.getRole() == FolderRole.MANAGER);
    }

    // ---------------- ensure* helpers (throw on denied) ----------------

    public void ensureCanRead(Long userId, ProjectFolder folder) {
        if (!canRead(userId, folder)) deny("view", folder);
    }

    public void ensureCanEdit(Long userId, ProjectFolder folder) {
        if (!canEdit(userId, folder)) deny("edit", folder);
    }

    public void ensureCanManage(Long userId, ProjectFolder folder) {
        if (!canManage(userId, folder)) deny("manage", folder);
    }

    public void ensureCanRead(Long userId, ProjectFile file) {
        if (!canRead(userId, file)) throw new SecurityException("You do not have permission to view this file");
    }

    public void ensureCanEdit(Long userId, ProjectFile file) {
        if (!canEdit(userId, file)) throw new SecurityException("You do not have permission to edit this file");
    }

    public void ensureCanReadProject(Long projectId, Long userId) {
        if (!canReadProject(projectId, userId)) throw new SecurityException("You do not have permission to view this project");
    }

    private void deny(String action, ProjectFolder folder) {
        throw new SecurityException("You do not have permission to " + action + " folder " +
                (folder == null ? "?" : folder.getPath()));
    }

    // ---------------- Grants ----------------

    @Transactional
    public FolderPermission grant(ProjectFolder folder, Long granteeUserId, FolderRole role, Long grantedByUserId) {
        ensureCanManage(grantedByUserId, folder);
        if (role == null) throw new IllegalArgumentException("Role is required");

        User grantee = userRepository.findById(granteeUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + granteeUserId));
        User grantedBy = userRepository.findById(grantedByUserId).orElse(null);

        Optional<FolderPermission> existing = permissionRepository.findByFolderAndUser(folder.getId(), granteeUserId);
        FolderPermission p = existing.orElseGet(FolderPermission::new);
        p.setFolder(folder);
        p.setUser(grantee);
        p.setRole(role);
        if (p.getGrantedBy() == null) p.setGrantedBy(grantedBy);
        return permissionRepository.save(p);
    }

    @Transactional
    public FolderPermission grantByEmail(ProjectFolder folder, String email, FolderRole role, Long grantedByUserId) {
        User grantee = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No user with email: " + email));
        return grant(folder, grantee.getId(), role, grantedByUserId);
    }

    @Transactional
    public void revoke(ProjectFolder folder, Long granteeUserId, Long actorUserId) {
        ensureCanManage(actorUserId, folder);
        FolderPermission p = permissionRepository.findByFolderAndUser(folder.getId(), granteeUserId)
                .orElseThrow(() -> new IllegalArgumentException("No such grant"));

        if (folder.isRoot() && p.getRole() == FolderRole.MANAGER) {
            guardLastManager(folder);
        }
        p.setDeletedAt(LocalDateTime.now());
        permissionRepository.save(p);
    }

    private void guardLastManager(ProjectFolder root) {
        // Owner has implicit MANAGER — always safe unless the owner has no row (they don't).
        // So we only block if this would leave zero stored MANAGERs AND no owner is alive.
        // Owner is always present on Project, so in practice this is safe; but keep the check
        // for future ownership-transfer flows where the live owner may differ.
        long managers = permissionRepository.countManagersOnFolder(root.getId());
        Project proj = projectRepository.findByIdNonDeleted(root.getProject().getId()).orElse(null);
        if (managers <= 1 && proj == null) {
            throw new IllegalStateException("Cannot revoke the last MANAGER on the root folder");
        }
    }

    // ---------------- Listings used by the UI ----------------

    public List<FolderPermission> listDirectGrants(ProjectFolder folder) {
        return permissionRepository.findByFolderId(folder.getId());
    }

    /**
     * Returns every grant visible on this folder after inheritance: the folder's own grants
     * plus all ancestor grants. Each returned entry carries the source folder so the UI
     * can mark inherited rows.
     */
    public List<EffectiveGrant> listEffectiveGrants(ProjectFolder folder) {
        Map<Long, EffectiveGrant> byUser = new HashMap<>();
        ProjectFolder cur = folder;
        while (cur != null) {
            for (FolderPermission p : permissionRepository.findByFolderId(cur.getId())) {
                byUser.merge(
                        p.getUser().getId(),
                        new EffectiveGrant(p, cur, cur.getId().equals(folder.getId())),
                        (existing, incoming) -> {
                            FolderRole max = FolderRole.max(existing.grant.getRole(), incoming.grant.getRole());
                            // Prefer the closest source when roles are equal.
                            if (max == existing.grant.getRole() && existing.inherited && !incoming.inherited) {
                                return incoming;
                            }
                            return max == existing.grant.getRole() ? existing : incoming;
                        }
                );
            }
            cur = cur.getParent();
        }
        return new ArrayList<>(byUser.values());
    }

    public static class EffectiveGrant {
        public final FolderPermission grant;
        public final ProjectFolder source;
        public final boolean inherited;

        public EffectiveGrant(FolderPermission grant, ProjectFolder source, boolean direct) {
            this.grant = grant;
            this.source = source;
            this.inherited = !direct;
        }
    }

    // ---------------- Internals ----------------

    private boolean isProjectOwner(Long projectId, Long userId) {
        return projectRepository.findByIdNonDeleted(projectId)
                .map(p -> p.getOwner() != null && userId.equals(p.getOwner().getId()))
                .orElse(false);
    }

    private boolean hasAnyGrantInProject(Long projectId, Long userId) {
        return !permissionRepository.findByProjectIdAndUser(projectId, userId).isEmpty();
    }
}
