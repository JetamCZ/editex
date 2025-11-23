package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectMember;
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
    private final ProjectMemberService projectMemberService;

    public List<Project> getAllProjects() {
        return projectRepository.findAllNonDeleted();
    }

    public Optional<Project> getProjectById(String id, Long userId) {
        Optional<Project> project = projectRepository.findByIdNonDeleted(id);
        if (project.isPresent()) {
            projectMemberService.ensureCanRead(id, userId);
        }
        return project;
    }

    public List<Project> getProjectsByOwner(Long ownerId) {
        return projectRepository.findByOwnerNonDeleted(ownerId);
    }

    @Transactional
    public Project createProject(Project project, Long ownerId) {
        Project savedProject = projectRepository.save(project);

        projectMemberService.addMember(
                savedProject.getId(),
                ownerId,
                ProjectMember.Role.OWNER,
                null
        );

        return savedProject;
    }

    @Transactional
    public Optional<Project> updateProject(String id, Project updatedProject, Long userId) {
        projectMemberService.ensureCanEdit(id, userId);

        return projectRepository.findByIdNonDeleted(id)
            .map(project -> {
                project.setName(updatedProject.getName());
                return projectRepository.save(project);
            });
    }

    @Transactional
    public boolean deleteProject(String id, Long userId) {
        projectMemberService.ensureCanManage(id, userId);

        return projectRepository.findByIdNonDeleted(id)
            .map(project -> {
                project.setDeletedAt(LocalDateTime.now());
                projectRepository.save(project);
                return true;
            })
            .orElse(false);
    }
}
