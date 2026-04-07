package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.DocumentChange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentChangeRepository extends JpaRepository<DocumentChange, Long> {

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.id = :fileId ORDER BY dc.id ASC")
    List<DocumentChange> findByFileIdOrderByCreatedAt(@Param("fileId") String fileId);

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.id = :fileId ORDER BY dc.id DESC LIMIT 1")
    Optional<DocumentChange> findLatestByFileId(@Param("fileId") String fileId);

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.id = :fileId AND dc.id > :afterChangeId ORDER BY dc.id ASC")
    List<DocumentChange> findByFileIdAfterChange(@Param("fileId") String fileId, @Param("afterChangeId") Long afterChangeId);

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.sessionId = :sessionId ORDER BY dc.createdAt ASC")
    List<DocumentChange> findBySessionIdOrderByCreatedAt(@Param("sessionId") String sessionId);

}
