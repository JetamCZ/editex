package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.ProjectInvitation;
import eu.puhony.latex_editor.entity.ProjectMember;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectInvitationResponse {
    private String id;
    private String projectId;
    private String projectName;
    private Long invitedUserId;
    private String invitedUserEmail;
    private String invitedUserName;
    private Long invitedBy;
    private String invitedByEmail;
    private String invitedByName;
    private ProjectMember.Role role;
    private ProjectInvitation.Status status;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;

    public static ProjectInvitationResponse from(ProjectInvitation invitation) {
        ProjectInvitationResponse response = new ProjectInvitationResponse();
        response.setId(invitation.getId());
        response.setProjectId(invitation.getProjectId());
        response.setInvitedUserId(invitation.getInvitedUserId());
        response.setInvitedBy(invitation.getInvitedBy());
        response.setRole(invitation.getRole());
        response.setStatus(invitation.getStatus());
        response.setCreatedAt(invitation.getCreatedAt());
        response.setRespondedAt(invitation.getRespondedAt());

        if (invitation.getProject() != null) {
            response.setProjectName(invitation.getProject().getName());
        }

        if (invitation.getInvitedUser() != null) {
            response.setInvitedUserEmail(invitation.getInvitedUser().getEmail());
            response.setInvitedUserName(invitation.getInvitedUser().getName());
        }

        if (invitation.getInviter() != null) {
            response.setInvitedByEmail(invitation.getInviter().getEmail());
            response.setInvitedByName(invitation.getInviter().getName());
        }

        return response;
    }
}
