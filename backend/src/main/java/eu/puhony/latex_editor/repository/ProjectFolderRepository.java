package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.ProjectFolder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectFolderRepository extends JpaRepository<ProjectFolder, Long> {

    @Query("SELECT f FROM ProjectFolder f WHERE f.id = :id AND f.deletedAt IS NULL")
    Optional<ProjectFolder> findByIdNonDeleted(@Param("id") Long id);

    @Query("SELECT f FROM ProjectFolder f WHERE f.baseProject = :baseProject AND f.deletedAt IS NULL")
    List<ProjectFolder> findAllByBaseProject(@Param("baseProject") String baseProject);

    @Query("SELECT f FROM ProjectFolder f WHERE f.baseProject = :baseProject AND f.parent IS NULL AND f.deletedAt IS NULL")
    Optional<ProjectFolder> findRoot(@Param("baseProject") String baseProject);

    @Query("SELECT f FROM ProjectFolder f WHERE f.baseProject = :baseProject AND f.path = :path AND f.deletedAt IS NULL")
    Optional<ProjectFolder> findByBaseProjectAndPath(@Param("baseProject") String baseProject, @Param("path") String path);

    @Query("SELECT f FROM ProjectFolder f WHERE f.parent.id = :parentId AND f.deletedAt IS NULL")
    List<ProjectFolder> findChildren(@Param("parentId") Long parentId);
}
