package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.CreateProjectRequest;
import eu.puhony.latex_editor.dto.FileUploadResponse;
import eu.puhony.latex_editor.dto.ProjectWithRoleResponse;
import eu.puhony.latex_editor.dto.UpdateProjectRequest;
import eu.puhony.latex_editor.entity.FolderRole;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.ProjectRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.DocumentChangeService;
import eu.puhony.latex_editor.service.FileService;
import eu.puhony.latex_editor.service.FolderPermissionService;
import eu.puhony.latex_editor.service.ProjectService;
import eu.puhony.latex_editor.service.TemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final UserRepository userRepository;
    private final FileService fileService;
    private final FolderPermissionService folderPermissionService;
    private final ProjectRepository projectRepository;
    private final DocumentChangeService documentChangeService;
    private final TemplateService templateService;

    @GetMapping("/templates")
    public ResponseEntity<List<TemplateService.TemplateInfo>> getTemplates() {
        return ResponseEntity.ok(templateService.getAvailableTemplates());
    }

    @GetMapping("/me")
    public ResponseEntity<List<ProjectWithRoleResponse>> getCurrentUserProjects(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Project> projects = projectRepository.findProjectsAccessibleByUser(user.getId());

        List<ProjectWithRoleResponse> response = new ArrayList<>();
        for (Project project : projects) {
            FolderRole role = folderPermissionService.effectiveRoleOnRoot(project.getBaseProject(), user.getId());
            if (role != null) {
                response.add(ProjectWithRoleResponse.from(project, role));
            }
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{baseProject}/{branch}")
    public ResponseEntity<ProjectWithRoleResponse> getProjectByBaseProjectAndBranch(
            @PathVariable String baseProject,
            @PathVariable String branch,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return projectService.getProjectByBaseProjectAndBranch(baseProject, branch, user.getId())
            .map(project -> {
                FolderRole role = folderPermissionService.effectiveRoleOnRoot(baseProject, user.getId());
                return ResponseEntity.ok(ProjectWithRoleResponse.from(project, role));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ProjectWithRoleResponse> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            Authentication authentication) {
        User owner = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = new Project();
        project.setName(request.getName());
        project.setOwner(owner);
        project.setBranch("main");
        Project createdProject = projectService.createProjectWithTemplate(project, owner, request.getTemplateId());

        ProjectWithRoleResponse response = ProjectWithRoleResponse.from(createdProject, FolderRole.MANAGER);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{baseProject}/{branch}")
    public ResponseEntity<ProjectWithRoleResponse> updateProject(
            @PathVariable String baseProject,
            @PathVariable String branch,
            @Valid @RequestBody UpdateProjectRequest request,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = new Project();
        project.setName(request.getName());

        return projectService.updateProject(baseProject, branch, project, user.getId())
            .map(updatedProject -> {
                FolderRole role = folderPermissionService.effectiveRoleOnRoot(baseProject, user.getId());
                return ResponseEntity.ok(ProjectWithRoleResponse.from(updatedProject, role));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{baseProject}/{branch}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable String baseProject,
            @PathVariable String branch,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean deleted = projectService.deleteProject(baseProject, branch, user.getId());
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @GetMapping("/{baseProject}/{branch}/files")
    public ResponseEntity<List<FileUploadResponse>> getProjectFiles(
            @PathVariable String baseProject,
            @PathVariable String branch,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectService.getProjectByBaseProjectAndBranch(baseProject, branch, user.getId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        List<ProjectFile> files = fileService.getProjectFiles(project.getId(), baseProject, user.getId());
        List<FileUploadResponse> response = files.stream()
                .map(file -> {
                    Long lastChangeId = documentChangeService.getLatestChange(file.getId(), user.getId())
                            .map(eu.puhony.latex_editor.entity.DocumentChange::getId)
                            .orElse(null);

                    return new FileUploadResponse(
                            file.getId(),
                            file.getProject().getBaseProject(),
                            file.getProjectFolder(),
                            file.getFileName(),
                            file.getOriginalFileName(),
                            file.getFileSize(),
                            file.getFileType(),
                            file.getS3Url(),
                            file.getUploadedBy().getId(),
                            file.getCreatedAt(),
                            lastChangeId,
                            file.getActiveBranch() != null ? file.getActiveBranch().getId() : null,
                            file.getActiveBranch() != null ? file.getActiveBranch().getName() : null
                    );
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }
}
