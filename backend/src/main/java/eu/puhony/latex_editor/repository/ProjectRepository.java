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

    @Query("SELECT p FROM Project p WHERE p.baseProject = :baseProject AND p.branch = :branch AND p.deletedAt IS NULL")
    Optional<Project> findByBaseProjectAndBranchNonDeleted(@Param("baseProject") String baseProject, @Param("branch") String branch);

    @Query("SELECT p FROM Project p WHERE p.owner.id = :ownerId AND p.deletedAt IS NULL")
    List<Project> findByOwnerNonDeleted(@Param("ownerId") Long ownerId);

    /**
     * All projects (main branches) the user can access: either they own the project, or
     * they have at least one FolderPermission grant on any folder of that project.
     */
    @Query("SELECT DISTINCT p FROM Project p " +
           "WHERE p.branch = 'main' AND p.deletedAt IS NULL AND (" +
           "   p.owner.id = :userId OR " +
           "   p.baseProject IN (" +
           "       SELECT DISTINCT fp.folder.baseProject FROM FolderPermission fp " +
           "       WHERE fp.user.id = :userId AND fp.deletedAt IS NULL" +
           "   )" +
           ")")
    List<Project> findProjectsAccessibleByUser(@Param("userId") Long userId);

    @Query("SELECT p FROM Project p WHERE p.branch = 'main' AND p.deletedAt IS NULL")
    List<Project> findAllMainBranchNonDeleted();
}
