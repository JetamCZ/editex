package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.ProjectMemberResponse;
import eu.puhony.latex_editor.dto.UpdateMemberRoleRequest;
import eu.puhony.latex_editor.entity.ProjectMember;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.ProjectMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
@RequiredArgsConstructor
public class ProjectMemberController {

    private final ProjectMemberService projectMemberService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<ProjectMemberResponse>> getProjectMembers(
            @PathVariable String projectId,
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        projectMemberService.ensureCanRead(projectId, currentUser.getId());

        List<ProjectMember> members = projectMemberService.getProjectMembers(projectId);
        List<ProjectMemberResponse> response = members.stream()
                .map(ProjectMemberResponse::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{userId}")
    public ResponseEntity<ProjectMemberResponse> updateMemberRole(
            @PathVariable String projectId,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateMemberRoleRequest request,
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        projectMemberService.ensureCanManage(projectId, currentUser.getId());

        ProjectMember updatedMember = projectMemberService.updateMemberRole(projectId, userId, request.getRole());
        return ResponseEntity.ok(ProjectMemberResponse.from(updatedMember));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable String projectId,
            @PathVariable Long userId,
            Authentication authentication) {
        User currentUser = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        projectMemberService.ensureCanManage(projectId, currentUser.getId());

        projectMemberService.removeMember(projectId, userId);
        return ResponseEntity.noContent().build();
    }
}
