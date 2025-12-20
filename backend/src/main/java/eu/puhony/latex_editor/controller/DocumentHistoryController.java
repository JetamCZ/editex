package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.ActiveSessionResponse;
import eu.puhony.latex_editor.dto.DocumentChangeHistoryResponse;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.DocumentSessionService;
import eu.puhony.latex_editor.service.DocumentSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentHistoryController {

    private final DocumentSyncService documentSyncService;
    private final DocumentSessionService sessionService;
    private final UserRepository userRepository;

    /**
     * Get full change history for a document
     * GET /api/documents/{fileId}/history
     */
    @GetMapping("/{fileId}/history")
    public ResponseEntity<List<DocumentChangeHistoryResponse>> getChangeHistory(
        @PathVariable String fileId,
        Authentication authentication
    ) {
        // Verify user is authenticated
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<DocumentChangeHistoryResponse> history = documentSyncService.getChangeHistory(fileId);
        return ResponseEntity.ok(history);
    }

    /**
     * Get changes since a specific timestamp
     * GET /api/documents/{fileId}/history/since?timestamp=2024-01-01T10:00:00
     */
    @GetMapping("/{fileId}/history/since")
    public ResponseEntity<List<DocumentChangeHistoryResponse>> getChangesSince(
        @PathVariable String fileId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime timestamp,
        Authentication authentication
    ) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<DocumentChangeHistoryResponse> changes = documentSyncService.getChangesSince(fileId, timestamp);
        return ResponseEntity.ok(changes);
    }

    /**
     * Get changes made by a specific user
     * GET /api/documents/{fileId}/history/user/{userId}
     */
    @GetMapping("/{fileId}/history/user/{userId}")
    public ResponseEntity<List<DocumentChangeHistoryResponse>> getChangesByUser(
        @PathVariable String fileId,
        @PathVariable Long userId,
        Authentication authentication
    ) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<DocumentChangeHistoryResponse> changes = documentSyncService.getChangesByUser(fileId, userId);
        return ResponseEntity.ok(changes);
    }

    /**
     * Get currently active editing sessions for a document
     * GET /api/documents/{fileId}/sessions/active
     */
    @GetMapping("/{fileId}/sessions/active")
    public ResponseEntity<List<ActiveSessionResponse>> getActiveSessions(
        @PathVariable String fileId,
        Authentication authentication
    ) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<ActiveSessionResponse> sessions = sessionService.getActiveSessions(fileId);
        return ResponseEntity.ok(sessions);
    }

    /**
     * End a specific session (admin/owner action or user ending their own session)
     * DELETE /api/documents/sessions/{sessionId}
     */
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> endSession(
        @PathVariable String sessionId,
        Authentication authentication
    ) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        sessionService.endSession(sessionId);
        return ResponseEntity.ok().build();
    }

    /**
     * End current user's session for a document
     * POST /api/documents/{fileId}/sessions/end
     */
    @PostMapping("/{fileId}/sessions/end")
    public ResponseEntity<Void> endCurrentUserSession(
        @PathVariable String fileId,
        Authentication authentication
    ) {
        User user = userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new RuntimeException("User not found"));

        sessionService.endUserSession(fileId, user.getId());
        return ResponseEntity.ok().build();
    }
}
