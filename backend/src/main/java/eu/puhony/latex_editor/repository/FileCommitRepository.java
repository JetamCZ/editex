package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.FileCommit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileCommitRepository extends JpaRepository<FileCommit, Long> {

    @Query("SELECT fc FROM FileCommit fc WHERE fc.branch.id = :branchId ORDER BY fc.id DESC")
    List<FileCommit> findByBranchIdOrderByIdDesc(@Param("branchId") String branchId);

    @Query("SELECT fc FROM FileCommit fc WHERE fc.branch.id = :branchId ORDER BY fc.id DESC LIMIT 1")
    Optional<FileCommit> findLatestByBranchId(@Param("branchId") String branchId);

    @Query("SELECT fc FROM FileCommit fc WHERE fc.hash = :hash")
    Optional<FileCommit> findByHash(@Param("hash") String hash);

    @Query("SELECT fc FROM FileCommit fc WHERE fc.hash = :hash AND fc.branch.file.project.id = :projectId")
    Optional<FileCommit> findByHashAndProjectId(@Param("hash") String hash, @Param("projectId") Long projectId);
}
