package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.DocumentSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentSessionRepository extends JpaRepository<DocumentSession, String> {

    // Find active sessions for a specific file
    List<DocumentSession> findByFileIdAndIsActiveTrue(String fileId);

    // Find active session for a specific user and file
    Optional<DocumentSession> findByFileIdAndUserIdAndIsActiveTrue(
        String fileId,
        Long userId
    );

    // Find all active sessions for a user
    List<DocumentSession> findByUserIdAndIsActiveTrue(Long userId);

    // Deactivate all sessions for a file
    @Modifying
    @Query("UPDATE DocumentSession ds SET ds.isActive = false, ds.endedAt = :endTime " +
           "WHERE ds.fileId = :fileId AND ds.isActive = true")
    void deactivateAllSessionsForFile(
        @Param("fileId") String fileId,
        @Param("endTime") LocalDateTime endTime
    );

    // Deactivate session for a specific user and file
    @Modifying
    @Query("UPDATE DocumentSession ds SET ds.isActive = false, ds.endedAt = :endTime " +
           "WHERE ds.fileId = :fileId AND ds.user.id = :userId AND ds.isActive = true")
    void deactivateUserSession(
        @Param("fileId") String fileId,
        @Param("userId") Long userId,
        @Param("endTime") LocalDateTime endTime
    );

    // Clean up old inactive sessions (e.g., older than 24 hours)
    @Query("SELECT ds FROM DocumentSession ds " +
           "WHERE ds.isActive = true AND ds.updatedAt < :threshold")
    List<DocumentSession> findStaleActiveSessions(@Param("threshold") LocalDateTime threshold);
}
