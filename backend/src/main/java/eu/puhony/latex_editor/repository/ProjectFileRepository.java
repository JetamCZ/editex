package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.ProjectFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectFileRepository extends JpaRepository<ProjectFile, String> {

    @Query("SELECT f FROM ProjectFile f WHERE f.deletedAt IS NULL")
    List<ProjectFile> findAllNonDeleted();

    @Query("SELECT f FROM ProjectFile f WHERE f.id = :id AND f.deletedAt IS NULL")
    Optional<ProjectFile> findByIdNonDeleted(@Param("id") String id);

    @Query("SELECT f FROM ProjectFile f WHERE f.project.id = :projectId AND f.deletedAt IS NULL")
    List<ProjectFile> findByProjectIdNonDeleted(@Param("projectId") Long projectId);

    @Query("SELECT f FROM ProjectFile f WHERE f.project.id = :projectId AND f.projectFolder = :folder AND f.deletedAt IS NULL")
    List<ProjectFile> findByProjectIdAndFolderNonDeleted(@Param("projectId") Long projectId, @Param("folder") String folder);
}
