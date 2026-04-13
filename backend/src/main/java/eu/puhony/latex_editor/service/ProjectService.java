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
        project.ifPresent(p -> folderPermissionService.ensureCanReadProject(p.getBaseProject(), userId));
        return project;
    }

    public Optional<Project> getProjectByBaseProjectAndBranch(String baseProject, String branch, Long userId) {
        folderPermissionService.ensureCanReadProject(baseProject, userId);
        return projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch);
    }

    public List<Project> getProjectsByOwner(Long ownerId) {
        return projectRepository.findByOwnerNonDeleted(ownerId);
    }

    @Transactional
    public Project createProject(Project project, User owner) {
        project.setBranch("main");
        Project savedProject = projectRepository.save(project);
        // Seed a root folder; owner gets implicit MANAGER via Project.owner, no grant row needed.
        projectFolderService.initializeForNewProject(savedProject.getBaseProject(), owner);
        return savedProject;
    }

    @Transactional
    public Project createProjectWithTemplate(Project project, User owner, String templateId) {
        Project createdProject = createProject(project, owner);
        templateService.initializeProjectFromTemplate(createdProject, templateId, owner);
        return createdProject;
    }

    @Transactional
    public Optional<Project> updateProject(String baseProject, String branch, Project updatedProject, Long userId) {
        ProjectFolder root = projectFolderService.getRoot(baseProject);
        folderPermissionService.ensureCanManage(userId, root);

        return projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
            .map(project -> {
                project.setName(updatedProject.getName());
                return projectRepository.save(project);
            });
    }

    @Transactional
    public boolean deleteProject(String baseProject, String branch, Long userId) {
        // Only the project owner may delete the project.
        Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, "main")
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        if (project.getOwner() == null || !project.getOwner().getId().equals(userId)) {
            throw new SecurityException("Only the project owner can delete this project");
        }

        return projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
            .map(p -> {
                p.setDeletedAt(LocalDateTime.now());
                projectRepository.save(p);
                return true;
            })
            .orElse(false);
    }
}
