package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.DocumentChange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentChangeRepository extends JpaRepository<DocumentChange, String> {

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.id = :fileId ORDER BY dc.createdAt ASC")
    List<DocumentChange> findByFileIdOrderByCreatedAt(@Param("fileId") String fileId);

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.id = :fileId ORDER BY dc.createdAt DESC LIMIT 1")
    Optional<DocumentChange> findLatestByFileId(@Param("fileId") String fileId);

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.id = :fileId AND dc.createdAt > " +
           "(SELECT dc2.createdAt FROM DocumentChange dc2 WHERE dc2.id = :afterChangeId) " +
           "ORDER BY dc.createdAt ASC")
    List<DocumentChange> findByFileIdAfterChange(@Param("fileId") String fileId, @Param("afterChangeId") String afterChangeId);

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.sessionId = :sessionId ORDER BY dc.createdAt ASC")
    List<DocumentChange> findBySessionIdOrderByCreatedAt(@Param("sessionId") String sessionId);

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.project.id = :projectId ORDER BY dc.createdAt DESC LIMIT 1")
    Optional<DocumentChange> findLatestByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT COUNT(dc) FROM DocumentChange dc WHERE dc.file.project.id = :projectId AND dc.createdAt > " +
           "(SELECT dc2.createdAt FROM DocumentChange dc2 WHERE dc2.id = :afterChangeId)")
    long countByProjectIdAfterChange(@Param("projectId") Long projectId, @Param("afterChangeId") String afterChangeId);

    @Query("SELECT COUNT(dc) FROM DocumentChange dc WHERE dc.file.project.id = :projectId")
    long countByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.project.id = :projectId ORDER BY dc.createdAt DESC")
    List<DocumentChange> findRecentByProjectId(@Param("projectId") Long projectId, org.springframework.data.domain.Pageable pageable);
}
