package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.ProjectMember;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.ProjectMemberRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProjectMemberService {

    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    public List<ProjectMember> getProjectMembers(String baseProject) {
        return projectMemberRepository.findByBaseProject(baseProject);
    }

    public Optional<ProjectMember> getProjectMember(String baseProject, Long userId) {
        return projectMemberRepository.findByBaseProjectAndUserId(baseProject, userId);
    }

    public List<ProjectMember> getUserProjects(Long userId) {
        return projectMemberRepository.findByUserId(userId);
    }

    public List<ProjectMember> getUserOwnedProjects(Long userId) {
        return projectMemberRepository.findOwnedProjectsByUserId(userId);
    }

    public List<ProjectMember> getUserSharedProjects(Long userId) {
        return projectMemberRepository.findSharedProjectsByUserId(userId);
    }

    @Transactional
    public ProjectMember addMember(String baseProject, Long userId, ProjectMember.Role role, Long invitedBy) {
        if (projectMemberRepository.existsByBaseProjectAndUserId(baseProject, userId)) {
            throw new IllegalStateException("User is already a member of this project");
        }

        ProjectMember member = new ProjectMember();
        member.setBaseProject(baseProject);
        member.setUserId(userId);
        member.setRole(role);
        member.setInvitedBy(invitedBy);

        return projectMemberRepository.save(member);
    }

    @Transactional
    public void removeMember(String baseProject, Long userId) {
        ProjectMember member = projectMemberRepository.findByBaseProjectAndUserId(baseProject, userId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        if (member.getRole() == ProjectMember.Role.OWNER) {
            long memberCount = projectMemberRepository.countByBaseProject(baseProject);
            if (memberCount == 1) {
                throw new IllegalStateException("Cannot remove the last owner of the project");
            }
        }

        projectMemberRepository.delete(member);
    }

    @Transactional
    public ProjectMember updateMemberRole(String baseProject, Long userId, ProjectMember.Role newRole) {
        ProjectMember member = projectMemberRepository.findByBaseProjectAndUserId(baseProject, userId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        if (member.getRole() == ProjectMember.Role.OWNER && newRole != ProjectMember.Role.OWNER) {
            long ownerCount = projectMemberRepository.findByBaseProject(baseProject).stream()
                    .filter(m -> m.getRole() == ProjectMember.Role.OWNER)
                    .count();
            if (ownerCount == 1) {
                throw new IllegalStateException("Cannot change role of the last owner");
            }
        }

        member.setRole(newRole);
        return projectMemberRepository.save(member);
    }

    public boolean hasAccess(String baseProject, Long userId) {
        return projectMemberRepository.existsByBaseProjectAndUserId(baseProject, userId);
    }

    public boolean hasRole(String baseProject, Long userId, ProjectMember.Role requiredRole) {
        Optional<ProjectMember> member = projectMemberRepository.findByBaseProjectAndUserId(baseProject, userId);
        if (member.isEmpty()) {
            return false;
        }

        return hasRequiredPermission(member.get().getRole(), requiredRole);
    }

    public boolean canRead(String baseProject, Long userId) {
        return hasAccess(baseProject, userId);
    }

    public boolean canEdit(String baseProject, Long userId) {
        return hasRole(baseProject, userId, ProjectMember.Role.EDITOR);
    }

    public boolean canManage(String baseProject, Long userId) {
        return hasRole(baseProject, userId, ProjectMember.Role.OWNER);
    }

    private boolean hasRequiredPermission(ProjectMember.Role userRole, ProjectMember.Role requiredRole) {
        return switch (requiredRole) {
            case VIEWER -> true;
            case EDITOR -> userRole == ProjectMember.Role.EDITOR || userRole == ProjectMember.Role.OWNER;
            case OWNER -> userRole == ProjectMember.Role.OWNER;
        };
    }

    public void ensureCanRead(String baseProject, Long userId) {
        if (!canRead(baseProject, userId)) {
            throw new SecurityException("You do not have permission to view this project");
        }
    }

    public void ensureCanEdit(String baseProject, Long userId) {
        if (!canEdit(baseProject, userId)) {
            throw new SecurityException("You do not have permission to edit this project");
        }
    }

    public void ensureCanManage(String baseProject, Long userId) {
        if (!canManage(baseProject, userId)) {
            throw new SecurityException("You do not have permission to manage this project");
        }
    }
}
