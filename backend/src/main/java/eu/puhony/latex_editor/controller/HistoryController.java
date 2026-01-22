package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.GroupedChangeResponse;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.DocumentChangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{baseProject}/{branch}/history")
@RequiredArgsConstructor
public class HistoryController {

    private final DocumentChangeService documentChangeService;
    private final UserRepository userRepository;

    /**
     * Get recent changes for a branch, grouped by session + file + time window.
     */
    @GetMapping
    public ResponseEntity<List<GroupedChangeResponse>> getRecentChanges(
            @PathVariable String baseProject,
            @PathVariable String branch,
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<GroupedChangeResponse> changes = documentChangeService.getRecentChangesGrouped(
                baseProject, branch, Math.min(limit, 100), user.getId());

        return ResponseEntity.ok(changes);
    }
}
