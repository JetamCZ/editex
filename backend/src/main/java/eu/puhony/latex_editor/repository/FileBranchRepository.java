package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.FileBranch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileBranchRepository extends JpaRepository<FileBranch, String> {

    @Query("SELECT fb FROM FileBranch fb WHERE fb.file.id = :fileId AND fb.deletedAt IS NULL")
    List<FileBranch> findByFileIdNonDeleted(@Param("fileId") String fileId);

    @Query("SELECT fb FROM FileBranch fb WHERE fb.file.id = :fileId AND fb.name = :name AND fb.deletedAt IS NULL")
    Optional<FileBranch> findByFileIdAndNameNonDeleted(@Param("fileId") String fileId, @Param("name") String name);

    @Query("SELECT fb FROM FileBranch fb WHERE fb.id = :id AND fb.deletedAt IS NULL")
    Optional<FileBranch> findByIdNonDeleted(@Param("id") String id);

    @Query("SELECT fb FROM FileBranch fb WHERE fb.file.project.id = :projectId AND fb.deletedAt IS NULL")
    List<FileBranch> findByProjectIdNonDeleted(@Param("projectId") Long projectId);
}
