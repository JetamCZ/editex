package eu.puhony.latex_editor.dto;

import eu.puhony.latex_editor.entity.ProjectMember;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberResponse {
    private Long id;
    private String projectId;
    private Long userId;
    private String userEmail;
    private String userName;
    private ProjectMember.Role role;
    private Long invitedBy;
    private String invitedByEmail;
    private String invitedByName;
    private LocalDateTime createdAt;

    public static ProjectMemberResponse from(ProjectMember member) {
        ProjectMemberResponse response = new ProjectMemberResponse();
        response.setId(member.getId());
        response.setProjectId(member.getProjectId());
        response.setUserId(member.getUserId());
        response.setRole(member.getRole());
        response.setInvitedBy(member.getInvitedBy());
        response.setCreatedAt(member.getCreatedAt());

        if (member.getUser() != null) {
            response.setUserEmail(member.getUser().getEmail());
            response.setUserName(member.getUser().getName());
        }

        if (member.getInviter() != null) {
            response.setInvitedByEmail(member.getInviter().getEmail());
            response.setInvitedByName(member.getInviter().getName());
        }

        return response;
    }
}
