package eu.puhony.latex_editor.controller;

import eu.puhony.latex_editor.dto.*;
import eu.puhony.latex_editor.entity.DocumentSession;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.UserRepository;
import eu.puhony.latex_editor.service.DocumentSessionService;
import eu.puhony.latex_editor.service.DocumentSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.List;

@Controller
@RequiredArgsConstructor
@Slf4j
public class DocumentCollaborationController {

    private final DocumentSyncService documentSyncService;
    private final DocumentSessionService sessionService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    /**
     * Handle document edit messages
     * Client sends to: /app/document/{fileId}/edit
     * Broadcast to: /topic/document/{fileId}
     */
    @MessageMapping("/document/{fileId}/edit")
    public void handleDocumentEdit(
        @DestinationVariable String fileId,
        @Payload DocumentEditMessage message,
        Principal principal
    ) {
        try {
            // Get user from Principal (email is the name)
            Long userId = getUserIdFromPrincipal(principal);

            log.info("Received edit for file {} from user {}", fileId, userId);

            // Process the document change
            DocumentSyncResponse response = documentSyncService.processDocumentChange(
                fileId,
                message.getSessionId(),
                userId,
                message.getDeltas()
            );

            // Update session activity
            if (message.getCursorPosition() != null || message.getCurrentLine() != null) {
                sessionService.updateSessionActivity(
                    message.getSessionId(),
                    message.getCursorPosition(),
                    message.getCurrentLine()
                );
            }

            // Broadcast the change to all subscribers of this document
            messagingTemplate.convertAndSend(
                "/topic/document/" + fileId,
                response
            );

            log.info("Broadcasted edit for file {} to all subscribers", fileId);

        } catch (Exception e) {
            log.error("Error handling document edit for file {}: {}", fileId, e.getMessage(), e);

            // Send error response
            DocumentSyncResponse errorResponse = new DocumentSyncResponse(
                fileId,
                message.getSessionId(),
                null,
                null,
                message.getDeltas(),
                null,
                null,
                java.time.LocalDateTime.now(),
                DocumentSyncResponse.SyncStatus.ERROR
            );

            messagingTemplate.convertAndSend("/topic/document/" + fileId, errorResponse);
        }
    }

    /**
     * Handle user joining a document
     * Client sends to: /app/document/{fileId}/join
     * Broadcast to: /topic/document/{fileId}/presence
     */
    @MessageMapping("/document/{fileId}/join")
    public void handleUserJoin(
        @DestinationVariable String fileId,
        @Payload UserPresenceMessage message,
        Principal principal
    ) {
        try {
            Long userId = getUserIdFromPrincipal(principal);

            log.info("User {} joining document {}", userId, fileId);

            // Create a new session
            DocumentSession session = sessionService.createSession(
                fileId,
                userId,
                message.getCursorPosition(),
                message.getCurrentLine()
            );

            // Get user details for presence message
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Broadcast presence to all users
            UserPresenceMessage presenceMessage = new UserPresenceMessage(
                fileId,
                userId,
                user.getName(),
                UserPresenceMessage.PresenceStatus.JOINED,
                message.getCursorPosition(),
                message.getCurrentLine()
            );

            messagingTemplate.convertAndSend(
                "/topic/document/" + fileId + "/presence",
                presenceMessage
            );

            log.info("User {} joined document {} with session {}", userId, fileId, session.getId());

        } catch (Exception e) {
            log.error("Error handling user join for file {}: {}", fileId, e.getMessage(), e);
        }
    }

    /**
     * Handle user leaving a document
     * Client sends to: /app/document/{fileId}/leave
     * Broadcast to: /topic/document/{fileId}/presence
     */
    @MessageMapping("/document/{fileId}/leave")
    public void handleUserLeave(
        @DestinationVariable String fileId,
        @Payload UserPresenceMessage message,
        Principal principal
    ) {
        try {
            Long userId = getUserIdFromPrincipal(principal);

            log.info("User {} leaving document {}", userId, fileId);

            // End the session
            sessionService.endUserSession(fileId, userId);

            // Get user details for presence message
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Broadcast presence to all users
            UserPresenceMessage presenceMessage = new UserPresenceMessage(
                fileId,
                userId,
                user.getName(),
                UserPresenceMessage.PresenceStatus.LEFT,
                null,
                null
            );

            messagingTemplate.convertAndSend(
                "/topic/document/" + fileId + "/presence",
                presenceMessage
            );

            log.info("User {} left document {}", userId, fileId);

        } catch (Exception e) {
            log.error("Error handling user leave for file {}: {}", fileId, e.getMessage(), e);
        }
    }

    /**
     * Handle cursor/selection updates
     * Client sends to: /app/document/{fileId}/cursor
     * Broadcast to: /topic/document/{fileId}/presence
     */
    @MessageMapping("/document/{fileId}/cursor")
    public void handleCursorUpdate(
        @DestinationVariable String fileId,
        @Payload UserPresenceMessage message,
        Principal principal
    ) {
        try {
            Long userId = getUserIdFromPrincipal(principal);

            // Update session with cursor position
            var session = sessionService.getActiveUserSession(fileId, userId);
            if (session.isPresent()) {
                sessionService.updateSessionActivity(
                    session.get().getId(),
                    message.getCursorPosition(),
                    message.getCurrentLine()
                );

                // Get user details for presence message
                User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

                // Broadcast cursor update
                UserPresenceMessage presenceMessage = new UserPresenceMessage(
                    fileId,
                    userId,
                    user.getName(),
                    UserPresenceMessage.PresenceStatus.EDITING,
                    message.getCursorPosition(),
                    message.getCurrentLine()
                );

                messagingTemplate.convertAndSend(
                    "/topic/document/" + fileId + "/presence",
                    presenceMessage
                );
            }

        } catch (Exception e) {
            log.error("Error handling cursor update for file {}: {}", fileId, e.getMessage(), e);
        }
    }

    /**
     * When user subscribes to a document, send current active sessions
     */
    @SubscribeMapping("/topic/document/{fileId}/presence")
    public List<ActiveSessionResponse> handlePresenceSubscription(@DestinationVariable String fileId) {
        log.info("Client subscribed to presence for file {}", fileId);
        return sessionService.getActiveSessions(fileId);
    }

    /**
     * Helper method to extract user ID from Principal
     * Principal name contains the email, we look up the user entity
     */
    private Long getUserIdFromPrincipal(Principal principal) {
        if (principal == null) {
            throw new RuntimeException("User not authenticated");
        }
        String email = principal.getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return user.getId();
    }
}
