package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.CreateFolderRequest;
import eu.puhony.latex_editor.dto.FolderResponse;
import eu.puhony.latex_editor.dto.RenameFolderRequest;
import eu.puhony.latex_editor.entity.FolderRole;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFolder;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.ProjectRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.FolderPermissionService;
import eu.puhony.latex_editor.service.ProjectFolderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FolderController {

    private final ProjectFolderService projectFolderService;
    private final FolderPermissionService folderPermissionService;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;

    @GetMapping("/projects/{projectId}/folders")
    public ResponseEntity<List<FolderResponse>> listFolders(
            @PathVariable Long projectId,
            Authentication authentication) {
        User user = currentUser(authentication);
        Project project = projectRepository.findByIdNonDeleted(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        folderPermissionService.ensureCanReadProject(project.getId(), user.getId());

        List<ProjectFolder> folders = projectFolderService.listAll(project.getId());
        List<FolderResponse> response = folders.stream()
                .map(f -> {
                    FolderRole role = folderPermissionService.effectiveRole(user.getId(), f);
                    boolean explicit = !folderPermissionService.listDirectGrants(f).isEmpty();
                    return FolderResponse.from(f, role, explicit);
                })
                .filter(r -> r.getEffectiveRole() != null)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/folders")
    public ResponseEntity<FolderResponse> createFolder(
            @Valid @RequestBody CreateFolderRequest request,
            Authentication authentication) {
        User user = currentUser(authentication);
        ProjectFolder parent = projectFolderService.getById(request.getParentId());
        ProjectFolder created = projectFolderService.createSubfolder(parent, request.getName(), user.getId());
        FolderRole role = folderPermissionService.effectiveRole(user.getId(), created);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(FolderResponse.from(created, role, false));
    }

    @PatchMapping("/folders/{folderId}")
    public ResponseEntity<FolderResponse> renameFolder(
            @PathVariable Long folderId,
            @Valid @RequestBody RenameFolderRequest request,
            Authentication authentication) {
        User user = currentUser(authentication);
        ProjectFolder folder = projectFolderService.getById(folderId);
        ProjectFolder renamed = projectFolderService.rename(folder, request.getName(), user.getId());
        FolderRole role = folderPermissionService.effectiveRole(user.getId(), renamed);
        boolean explicit = !folderPermissionService.listDirectGrants(renamed).isEmpty();
        return ResponseEntity.ok(FolderResponse.from(renamed, role, explicit));
    }

    @DeleteMapping("/folders/{folderId}")
    public ResponseEntity<Void> deleteFolder(
            @PathVariable Long folderId,
            Authentication authentication) {
        User user = currentUser(authentication);
        ProjectFolder folder = projectFolderService.getById(folderId);
        projectFolderService.softDelete(folder, user.getId());
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}
