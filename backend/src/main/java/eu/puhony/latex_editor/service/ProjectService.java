package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFolder;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectFolderService projectFolderService;
    private final FolderPermissionService folderPermissionService;
    private final TemplateService templateService;

    public List<Project> getAllProjects() {
        return projectRepository.findAllNonDeleted();
    }

    public Optional<Project> getProjectById(Long id, Long userId) {
        Optional<Project> project = projectRepository.findByIdNonDeleted(id);
        project.ifPresent(p -> folderPermissionService.ensureCanReadProject(p.getId(), userId));
        return project;
    }

    public List<Project> getProjectsByOwner(Long ownerId) {
        return projectRepository.findByOwnerNonDeleted(ownerId);
    }

    @Transactional
    public Project createProject(Project project, User owner) {
        Project savedProject = projectRepository.save(project);
        projectFolderService.initializeForNewProject(savedProject, owner);
        return savedProject;
    }

    @Transactional
    public Project createProjectWithTemplate(Project project, User owner, String templateId) {
        Project createdProject = createProject(project, owner);
        templateService.initializeProjectFromTemplate(createdProject, templateId, owner);
        return createdProject;
    }

    @Transactional
    public Optional<Project> updateProject(Long projectId, Project updatedProject, Long userId) {
        Optional<Project> existing = projectRepository.findByIdNonDeleted(projectId);
        if (existing.isEmpty()) return Optional.empty();
        ProjectFolder root = projectFolderService.getRoot(existing.get().getId());
        folderPermissionService.ensureCanManage(userId, root);

        return existing.map(project -> {
            project.setName(updatedProject.getName());
            return projectRepository.save(project);
        });
    }

    @Transactional
    public boolean deleteProject(Long projectId, Long userId) {
        Project project = projectRepository.findByIdNonDeleted(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        if (project.getOwner() == null || !project.getOwner().getId().equals(userId)) {
            throw new SecurityException("Only the project owner can delete this project");
        }

        project.setDeletedAt(LocalDateTime.now());
        projectRepository.save(project);
        return true;
    }
}
