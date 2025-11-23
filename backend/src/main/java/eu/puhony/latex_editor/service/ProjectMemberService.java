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

    public List<ProjectMember> getProjectMembers(String projectId) {
        return projectMemberRepository.findByProjectId(projectId);
    }

    public Optional<ProjectMember> getProjectMember(String projectId, Long userId) {
        return projectMemberRepository.findByProjectIdAndUserId(projectId, userId);
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
    public ProjectMember addMember(String projectId, Long userId, ProjectMember.Role role, Long invitedBy) {
        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new IllegalStateException("User is already a member of this project");
        }

        ProjectMember member = new ProjectMember();
        member.setProjectId(projectId);
        member.setUserId(userId);
        member.setRole(role);
        member.setInvitedBy(invitedBy);

        return projectMemberRepository.save(member);
    }

    @Transactional
    public void removeMember(String projectId, Long userId) {
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        if (member.getRole() == ProjectMember.Role.OWNER) {
            long memberCount = projectMemberRepository.countByProjectId(projectId);
            if (memberCount == 1) {
                throw new IllegalStateException("Cannot remove the last owner of the project");
            }
        }

        projectMemberRepository.delete(member);
    }

    @Transactional
    public ProjectMember updateMemberRole(String projectId, Long userId, ProjectMember.Role newRole) {
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        if (member.getRole() == ProjectMember.Role.OWNER && newRole != ProjectMember.Role.OWNER) {
            long ownerCount = projectMemberRepository.findByProjectId(projectId).stream()
                    .filter(m -> m.getRole() == ProjectMember.Role.OWNER)
                    .count();
            if (ownerCount == 1) {
                throw new IllegalStateException("Cannot change role of the last owner");
            }
        }

        member.setRole(newRole);
        return projectMemberRepository.save(member);
    }

    public boolean hasAccess(String projectId, Long userId) {
        return projectMemberRepository.existsByProjectIdAndUserId(projectId, userId);
    }

    public boolean hasRole(String projectId, Long userId, ProjectMember.Role requiredRole) {
        Optional<ProjectMember> member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId);
        if (member.isEmpty()) {
            return false;
        }

        return hasRequiredPermission(member.get().getRole(), requiredRole);
    }

    public boolean canRead(String projectId, Long userId) {
        return hasAccess(projectId, userId);
    }

    public boolean canEdit(String projectId, Long userId) {
        return hasRole(projectId, userId, ProjectMember.Role.EDITOR);
    }

    public boolean canManage(String projectId, Long userId) {
        return hasRole(projectId, userId, ProjectMember.Role.OWNER);
    }

    private boolean hasRequiredPermission(ProjectMember.Role userRole, ProjectMember.Role requiredRole) {
        return switch (requiredRole) {
            case VIEWER -> true;
            case EDITOR -> userRole == ProjectMember.Role.EDITOR || userRole == ProjectMember.Role.OWNER;
            case OWNER -> userRole == ProjectMember.Role.OWNER;
        };
    }

    public void ensureCanRead(String projectId, Long userId) {
        if (!canRead(projectId, userId)) {
            throw new SecurityException("You do not have permission to view this project");
        }
    }

    public void ensureCanEdit(String projectId, Long userId) {
        if (!canEdit(projectId, userId)) {
            throw new SecurityException("You do not have permission to edit this project");
        }
    }

    public void ensureCanManage(String projectId, Long userId) {
        if (!canManage(projectId, userId)) {
            throw new SecurityException("You do not have permission to manage this project");
        }
    }
}
