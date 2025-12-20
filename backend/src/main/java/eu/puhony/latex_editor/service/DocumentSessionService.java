package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.dto.ActiveSessionResponse;
import eu.puhony.latex_editor.entity.DocumentSession;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.DocumentSessionRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentSessionService {

    private final DocumentSessionRepository sessionRepository;
    private final UserRepository userRepository;

    @Transactional
    public DocumentSession createSession(String fileId, Long userId, Integer cursorPosition, Integer currentLine) {
        // Deactivate any existing active session for this user and file
        sessionRepository.deactivateUserSession(fileId, userId, LocalDateTime.now());

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        DocumentSession session = new DocumentSession();
        session.setFileId(fileId);
        session.setUser(user);
        session.setIsActive(true);
        session.setCursorPosition(cursorPosition);
        session.setCurrentLine(currentLine);

        DocumentSession savedSession = sessionRepository.save(session);
        log.info("Created session {} for user {} on file {}", savedSession.getId(), userId, fileId);
        return savedSession;
    }

    @Transactional
    public void updateSessionActivity(String sessionId, Integer cursorPosition, Integer currentLine) {
        Optional<DocumentSession> sessionOpt = sessionRepository.findById(sessionId);
        if (sessionOpt.isPresent()) {
            DocumentSession session = sessionOpt.get();
            session.setCursorPosition(cursorPosition);
            session.setCurrentLine(currentLine);
            sessionRepository.save(session);
        }
    }

    @Transactional
    public void endSession(String sessionId) {
        Optional<DocumentSession> sessionOpt = sessionRepository.findById(sessionId);
        if (sessionOpt.isPresent()) {
            DocumentSession session = sessionOpt.get();
            session.setIsActive(false);
            session.setEndedAt(LocalDateTime.now());
            sessionRepository.save(session);
            log.info("Ended session {} for user {} on file {}",
                sessionId, session.getUser().getId(), session.getFileId());
        }
    }

    @Transactional
    public void endUserSession(String fileId, Long userId) {
        sessionRepository.deactivateUserSession(fileId, userId, LocalDateTime.now());
        log.info("Ended session for user {} on file {}", userId, fileId);
    }

    public List<ActiveSessionResponse> getActiveSessions(String fileId) {
        List<DocumentSession> sessions = sessionRepository.findByFileIdAndIsActiveTrue(fileId);
        return sessions.stream()
            .map(this::toActiveSessionResponse)
            .collect(Collectors.toList());
    }

    public Optional<DocumentSession> getActiveUserSession(String fileId, Long userId) {
        return sessionRepository.findByFileIdAndUserIdAndIsActiveTrue(fileId, userId);
    }

    // Clean up stale sessions (older than 5 minutes of inactivity)
    @Scheduled(fixedRate = 60000) // Run every minute
    @Transactional
    public void cleanupStaleSessions() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(5);
        List<DocumentSession> staleSessions = sessionRepository.findStaleActiveSessions(threshold);

        for (DocumentSession session : staleSessions) {
            session.setIsActive(false);
            session.setEndedAt(LocalDateTime.now());
            sessionRepository.save(session);
            log.info("Cleaned up stale session {} for user {}", session.getId(), session.getUser().getId());
        }
    }

    private ActiveSessionResponse toActiveSessionResponse(DocumentSession session) {
        return new ActiveSessionResponse(
            session.getId(),
            session.getFileId(),
            session.getUser().getId(),
            session.getUser().getName(),
            session.getCursorPosition(),
            session.getCurrentLine(),
            session.getCreatedAt()
        );
    }
}
