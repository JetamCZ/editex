package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("SELECT p FROM Project p WHERE p.deletedAt IS NULL")
    List<Project> findAllNonDeleted();

    @Query("SELECT p FROM Project p WHERE p.id = :id AND p.deletedAt IS NULL")
    Optional<Project> findByIdNonDeleted(@Param("id") Long id);

    @Query("SELECT p FROM Project p WHERE p.baseProject = :baseProject AND p.deletedAt IS NULL")
    Optional<Project> findByBaseProjectNonDeleted(@Param("baseProject") String baseProject);

    @Query("SELECT p FROM Project p WHERE p.owner.id = :ownerId AND p.deletedAt IS NULL")
    List<Project> findByOwnerNonDeleted(@Param("ownerId") Long ownerId);

    @Query("SELECT DISTINCT p FROM Project p " +
           "WHERE p.deletedAt IS NULL AND (" +
           "   p.owner.id = :userId OR " +
           "   p.id IN (" +
           "       SELECT DISTINCT fp.folder.project.id FROM FolderPermission fp " +
           "       WHERE fp.user.id = :userId AND fp.deletedAt IS NULL" +
           "   )" +
           ")")
    List<Project> findProjectsAccessibleByUser(@Param("userId") Long userId);
}
