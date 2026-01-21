package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.CommitResponse;
import eu.puhony.latex_editor.dto.CreateCommitRequest;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.CommitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{baseProject}/commits")
@RequiredArgsConstructor
public class CommitController {

    private final CommitService commitService;
    private final UserRepository userRepository;

    /**
     * Get all commits for a project.
     */
    @GetMapping
    public ResponseEntity<List<CommitResponse>> getCommits(
            @PathVariable String baseProject,
            @RequestParam(required = false) String branch,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<CommitResponse> commits;
        if (branch != null && !branch.isEmpty()) {
            commits = commitService.getCommitsByBranch(baseProject, branch, user.getId());
        } else {
            commits = commitService.getCommits(baseProject, user.getId());
        }

        return ResponseEntity.ok(commits);
    }

    /**
     * Get a specific commit by ID.
     */
    @GetMapping("/{commitId}")
    public ResponseEntity<CommitResponse> getCommit(
            @PathVariable String baseProject,
            @PathVariable String commitId,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return commitService.getCommitById(commitId, user.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a new user commit (label/snapshot).
     */
    @PostMapping
    public ResponseEntity<CommitResponse> createCommit(
            @PathVariable String baseProject,
            @Valid @RequestBody CreateCommitRequest request,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        CommitResponse commit = commitService.createUserCommit(baseProject, request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(commit);
    }
}
