package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    public List<Project> getAllProjects() {
        return projectRepository.findAllNonDeleted();
    }

    public Optional<Project> getProjectById(String id) {
        return projectRepository.findByIdNonDeleted(id);
    }

    public List<Project> getProjectsByOwner(String owner) {
        return projectRepository.findByOwnerNonDeleted(owner);
    }

    @Transactional
    public Project createProject(Project project) {
        return projectRepository.save(project);
    }

    @Transactional
    public Optional<Project> updateProject(String id, Project updatedProject) {
        return projectRepository.findByIdNonDeleted(id)
            .map(project -> {
                project.setName(updatedProject.getName());
                project.setOwner(updatedProject.getOwner());
                return projectRepository.save(project);
            });
    }

    @Transactional
    public boolean deleteProject(String id) {
        return projectRepository.findByIdNonDeleted(id)
            .map(project -> {
                project.setDeletedAt(LocalDateTime.now());
                projectRepository.save(project);
                return true;
            })
            .orElse(false);
    }
}
