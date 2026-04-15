package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.FolderPermissionResponse;
import eu.puhony.latex_editor.dto.FolderResponse;
import eu.puhony.latex_editor.dto.GrantPermissionRequest;
import eu.puhony.latex_editor.entity.FolderPermission;
import eu.puhony.latex_editor.entity.FolderRole;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFolder;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.ProjectRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.FolderPermissionService;
import eu.puhony.latex_editor.service.ProjectFolderService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FolderPermissionController {

    private final FolderPermissionService folderPermissionService;
    private final ProjectFolderService projectFolderService;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;

    @GetMapping("/folders/{folderId}/permissions")
    public ResponseEntity<List<FolderPermissionResponse>> listPermissions(
            @PathVariable Long folderId,
            Authentication authentication) {
        User user = currentUser(authentication);
        ProjectFolder folder = projectFolderService.getById(folderId);
        // Reading permissions requires being able to read the folder (anyone with access can see who else has access).
        folderPermissionService.ensureCanRead(user.getId(), folder);

        List<FolderPermissionResponse> response = new ArrayList<>();
        for (FolderPermissionService.EffectiveGrant eg : folderPermissionService.listEffectiveGrants(folder)) {
            response.add(FolderPermissionResponse.fromEffective(eg, folderId));
        }

        // Also surface the project owner as an implicit MANAGER row at the root level.
        Project project = folder.getProject();
        if (project != null && project.getOwner() != null) {
            Long ownerId = project.getOwner().getId();
            boolean alreadyListed = response.stream().anyMatch(r -> ownerId.equals(r.getUserId()));
            if (!alreadyListed) {
                FolderPermissionResponse owner = new FolderPermissionResponse();
                owner.setId(null);
                owner.setFolderId(folderId);
                owner.setUserId(ownerId);
                owner.setUserEmail(project.getOwner().getEmail());
                owner.setUserName(project.getOwner().getName());
                owner.setRole(FolderRole.MANAGER);
                owner.setInherited(!folder.isRoot());
                ProjectFolder root = projectFolderService.getRoot(project.getId());
                owner.setSourceFolderId(root.getId());
                owner.setSourceFolderPath(root.getPath());
                response.add(owner);
            }
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/folders/{folderId}/permissions")
    public ResponseEntity<FolderPermissionResponse> grant(
            @PathVariable Long folderId,
            @Valid @RequestBody GrantPermissionRequest request,
            Authentication authentication) {
        User user = currentUser(authentication);
        ProjectFolder folder = projectFolderService.getById(folderId);

        FolderPermission grant;
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            grant = folderPermissionService.grantByEmail(folder, request.getEmail(), request.getRole(), user.getId());
        } else if (request.getUserId() != null) {
            grant = folderPermissionService.grant(folder, request.getUserId(), request.getRole(), user.getId());
        } else {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(FolderPermissionResponse.fromDirect(grant));
    }

    @PatchMapping("/folders/{folderId}/permissions/{userId}")
    public ResponseEntity<FolderPermissionResponse> updateRole(
            @PathVariable Long folderId,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateRoleRequest request,
            Authentication authentication) {
        User actor = currentUser(authentication);
        ProjectFolder folder = projectFolderService.getById(folderId);
        FolderPermission updated = folderPermissionService.grant(folder, userId, request.getRole(), actor.getId());
        return ResponseEntity.ok(FolderPermissionResponse.fromDirect(updated));
    }

    @DeleteMapping("/folders/{folderId}/permissions/{userId}")
    public ResponseEntity<Void> revoke(
            @PathVariable Long folderId,
            @PathVariable Long userId,
            Authentication authentication) {
        User actor = currentUser(authentication);
        ProjectFolder folder = projectFolderService.getById(folderId);
        folderPermissionService.revoke(folder, userId, actor.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Whole-project access summary used by the dedicated permissions page.
     * Returns the folder tree alongside the effective role of each user that
     * has any grant in the project.
     */
    @GetMapping("/projects/{projectId}/access-summary")
    public ResponseEntity<AccessSummaryResponse> accessSummary(
            @PathVariable Long projectId,
            Authentication authentication) {
        User user = currentUser(authentication);
        Project project = projectRepository.findByIdNonDeleted(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        folderPermissionService.ensureCanReadProject(project.getId(), user.getId());

        List<ProjectFolder> folders = projectFolderService.listAll(project.getId());
        // Collect every distinct user that has any grant in the project, plus the owner.
        ProjectFolder root = projectFolderService.getRoot(project.getId());

        List<UserSummary> users = new ArrayList<>();
        java.util.Set<Long> seen = new java.util.HashSet<>();
        if (project != null && project.getOwner() != null) {
            users.add(toUserSummary(project.getOwner()));
            seen.add(project.getOwner().getId());
        }
        for (FolderPermission p : folderPermissionService.listDirectGrants(root)) {
            if (seen.add(p.getUser().getId())) users.add(toUserSummary(p.getUser()));
        }
        for (ProjectFolder f : folders) {
            for (FolderPermission p : folderPermissionService.listDirectGrants(f)) {
                if (seen.add(p.getUser().getId())) users.add(toUserSummary(p.getUser()));
            }
        }

        List<FolderResponse> folderDtos = folders.stream()
                .map(f -> {
                    FolderRole role = folderPermissionService.effectiveRole(user.getId(), f);
                    boolean explicit = !folderPermissionService.listDirectGrants(f).isEmpty();
                    return FolderResponse.from(f, role, explicit);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(new AccessSummaryResponse(folderDtos, users));
    }

    private UserSummary toUserSummary(User u) {
        UserSummary s = new UserSummary();
        s.id = u.getId();
        s.email = u.getEmail();
        s.name = u.getName();
        return s;
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Data
    public static class UpdateRoleRequest {
        @jakarta.validation.constraints.NotNull
        private FolderRole role;
    }

    @Data
    public static class UserSummary {
        private Long id;
        private String email;
        private String name;
    }

    @Data
    public static class AccessSummaryResponse {
        private final List<FolderResponse> folders;
        private final List<UserSummary> users;
    }
}
