package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.DocumentChange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentChangeRepository extends JpaRepository<DocumentChange, UUID> {

    // Find all changes for a specific file, ordered by timestamp
    List<DocumentChange> findByFileIdOrderByCreatedAtAsc(String fileId);

    // Find changes for a file since a specific timestamp
    List<DocumentChange> findByFileIdAndCreatedAtAfterOrderByCreatedAtAsc(
        String fileId,
        LocalDateTime since
    );

    // Find changes by a specific user for a file
    List<DocumentChange> findByFileIdAndUserIdOrderByCreatedAtAsc(
        String fileId,
        Long userId
    );

    // Find recent changes for a file (pagination support)
    @Query("SELECT dc FROM DocumentChange dc WHERE dc.fileId = :fileId " +
           "ORDER BY dc.createdAt DESC")
    List<DocumentChange> findRecentChangesByFileId(
        @Param("fileId") String fileId
    );

    // Count changes by user for a specific file
    @Query("SELECT COUNT(dc) FROM DocumentChange dc " +
           "WHERE dc.fileId = :fileId AND dc.user.id = :userId")
    Long countChangesByFileAndUser(
        @Param("fileId") String fileId,
        @Param("userId") Long userId
    );
}
