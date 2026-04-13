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

    // Branch-aware queries
    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.id = :fileId AND dc.branch.id = :branchId ORDER BY dc.id ASC")
    List<DocumentChange> findByFileIdAndBranchIdOrderById(@Param("fileId") String fileId, @Param("branchId") String branchId);

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.id = :fileId AND dc.branch.id = :branchId ORDER BY dc.id DESC LIMIT 1")
    Optional<DocumentChange> findLatestByFileIdAndBranchId(@Param("fileId") String fileId, @Param("branchId") String branchId);

    @Query("SELECT dc FROM DocumentChange dc WHERE dc.file.id = :fileId AND dc.branch.id = :branchId AND dc.id > :afterChangeId ORDER BY dc.id ASC")
    List<DocumentChange> findByFileIdAndBranchIdAfterChange(@Param("fileId") String fileId, @Param("branchId") String branchId, @Param("afterChangeId") Long afterChangeId);

    @Query("SELECT CASE WHEN COUNT(dc) > 0 THEN true ELSE false END FROM DocumentChange dc WHERE dc.branch.id = :branchId")
    boolean existsByBranchId(@Param("branchId") String branchId);

    @Query("DELETE FROM DocumentChange dc WHERE dc.branch.id = :branchId")
    @org.springframework.data.jpa.repository.Modifying
    void deleteByBranchId(@Param("branchId") String branchId);
}
