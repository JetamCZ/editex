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

    @Query("SELECT DISTINCT p FROM Project p " +
           "JOIN ProjectMember pm ON pm.baseProject = p.baseProject " +
           "WHERE pm.userId = :userId AND p.branch = 'main' AND p.deletedAt IS NULL")
    List<Project> findProjectsByMembership(@Param("userId") Long userId);

    @Query("SELECT p FROM Project p WHERE p.branch = 'main' AND p.deletedAt IS NULL")
    List<Project> findAllMainBranchNonDeleted();

    @Query("SELECT p FROM Project p WHERE p.baseProject = :baseProject AND p.deletedAt IS NULL ORDER BY p.createdAt DESC")
    List<Project> findAllBranchesByBaseProject(@Param("baseProject") String baseProject);

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Project p " +
           "WHERE p.baseProject = :baseProject AND p.branch = :branch AND p.deletedAt IS NULL")
    boolean existsByBaseProjectAndBranch(@Param("baseProject") String baseProject, @Param("branch") String branch);
}
