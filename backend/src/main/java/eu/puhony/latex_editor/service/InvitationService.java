package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.ProjectInvitation;
import eu.puhony.latex_editor.entity.ProjectMember;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.ProjectInvitationRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private final ProjectInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final ProjectMemberService projectMemberService;

    public List<ProjectInvitation> getPendingInvitationsForUser(Long userId) {
        return invitationRepository.findPendingInvitationsByUserId(userId);
    }

    public List<ProjectInvitation> getPendingInvitationsForProject(String baseProject) {
        return invitationRepository.findPendingInvitationsByBaseProject(baseProject);
    }

    public List<ProjectInvitation> getPendingInvitationsSentByUser(Long userId) {
        return invitationRepository.findPendingInvitationsByInviterId(userId);
    }

    @Transactional
    public ProjectInvitation inviteUser(String baseProject, String invitedUserEmail, ProjectMember.Role role, Long invitedBy) {
        User invitedUser = userRepository.findByEmail(invitedUserEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + invitedUserEmail));

        if (projectMemberService.hasAccess(baseProject, invitedUser.getId())) {
            throw new IllegalStateException("User is already a member of this project");
        }

        if (invitationRepository.hasPendingInvitation(baseProject, invitedUser.getId())) {
            throw new IllegalStateException("User already has a pending invitation for this project");
        }

        ProjectInvitation invitation = new ProjectInvitation();
        invitation.setBaseProject(baseProject);
        invitation.setInvitedUserId(invitedUser.getId());
        invitation.setInvitedBy(invitedBy);
        invitation.setRole(role);
        invitation.setStatus(ProjectInvitation.Status.PENDING);

        return invitationRepository.save(invitation);
    }

    @Transactional
    public void acceptInvitation(String invitationId, Long userId) {
        ProjectInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitation not found"));

        if (!invitation.getInvitedUserId().equals(userId)) {
            throw new SecurityException("This invitation is not for you");
        }

        if (invitation.getStatus() != ProjectInvitation.Status.PENDING) {
            throw new IllegalStateException("This invitation has already been responded to");
        }

        invitation.setStatus(ProjectInvitation.Status.ACCEPTED);
        invitation.setRespondedAt(LocalDateTime.now());
        invitationRepository.save(invitation);

        projectMemberService.addMember(
                invitation.getBaseProject(),
                invitation.getInvitedUserId(),
                invitation.getRole(),
                invitation.getInvitedBy()
        );
    }

    @Transactional
    public void declineInvitation(String invitationId, Long userId) {
        ProjectInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitation not found"));

        if (!invitation.getInvitedUserId().equals(userId)) {
            throw new SecurityException("This invitation is not for you");
        }

        if (invitation.getStatus() != ProjectInvitation.Status.PENDING) {
            throw new IllegalStateException("This invitation has already been responded to");
        }

        invitation.setStatus(ProjectInvitation.Status.DECLINED);
        invitation.setRespondedAt(LocalDateTime.now());
        invitationRepository.save(invitation);
    }

    @Transactional
    public void cancelInvitation(String invitationId, Long userId, String baseProject) {
        ProjectInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitation not found"));

        if (!invitation.getBaseProject().equals(baseProject)) {
            throw new IllegalArgumentException("Invitation does not belong to this project");
        }

        projectMemberService.ensureCanManage(baseProject, userId);

        if (invitation.getStatus() != ProjectInvitation.Status.PENDING) {
            throw new IllegalStateException("Can only cancel pending invitations");
        }

        invitationRepository.delete(invitation);
    }
}
