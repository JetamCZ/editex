package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.InviteUserRequest;
import eu.puhony.latex_editor.dto.ProjectInvitationResponse;
import eu.puhony.latex_editor.entity.ProjectInvitation;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.InvitationService;
import eu.puhony.latex_editor.service.ProjectMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;
    private final ProjectMemberService projectMemberService;
    private final UserRepository userRepository;

    @PostMapping("/projects/{baseProject}/invitations")
    public ResponseEntity<ProjectInvitationResponse> inviteUser(
            @PathVariable String baseProject,
            @Valid @RequestBody InviteUserRequest request,
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        projectMemberService.ensureCanManage(baseProject, currentUser.getId());

        ProjectInvitation invitation = invitationService.inviteUser(
                baseProject,
                request.getEmail(),
                request.getRole(),
                currentUser.getId()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ProjectInvitationResponse.from(invitation));
    }

    @GetMapping("/projects/{baseProject}/invitations")
    public ResponseEntity<List<ProjectInvitationResponse>> getProjectInvitations(
            @PathVariable String baseProject,
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        projectMemberService.ensureCanManage(baseProject, currentUser.getId());

        List<ProjectInvitation> invitations = invitationService.getPendingInvitationsForProject(baseProject);
        List<ProjectInvitationResponse> response = invitations.stream()
                .map(ProjectInvitationResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/invitations/me")
    public ResponseEntity<List<ProjectInvitationResponse>> getMyInvitations(
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<ProjectInvitation> invitations = invitationService.getPendingInvitationsForUser(currentUser.getId());
        List<ProjectInvitationResponse> response = invitations.stream()
                .map(ProjectInvitationResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/invitations/sent")
    public ResponseEntity<List<ProjectInvitationResponse>> getMySentInvitations(
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<ProjectInvitation> invitations = invitationService.getPendingInvitationsSentByUser(currentUser.getId());
        List<ProjectInvitationResponse> response = invitations.stream()
                .map(ProjectInvitationResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/invitations/{invitationId}/accept")
    public ResponseEntity<Void> acceptInvitation(
            @PathVariable String invitationId,
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        invitationService.acceptInvitation(invitationId, currentUser.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/invitations/{invitationId}/decline")
    public ResponseEntity<Void> declineInvitation(
            @PathVariable String invitationId,
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        invitationService.declineInvitation(invitationId, currentUser.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/projects/{baseProject}/invitations/{invitationId}")
    public ResponseEntity<Void> cancelInvitation(
            @PathVariable String baseProject,
            @PathVariable String invitationId,
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        invitationService.cancelInvitation(invitationId, currentUser.getId(), baseProject);
        return ResponseEntity.noContent().build();
    }
}
