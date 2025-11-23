package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.projectId = :projectId")
    List<ProjectMember> findByProjectId(@Param("projectId") String projectId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.userId = :userId")
    List<ProjectMember> findByUserId(@Param("userId") Long userId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.projectId = :projectId AND pm.userId = :userId")
    Optional<ProjectMember> findByProjectIdAndUserId(@Param("projectId") String projectId, @Param("userId") Long userId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.projectId = :projectId AND pm.role = 'OWNER'")
    Optional<ProjectMember> findOwnerByProjectId(@Param("projectId") String projectId);

    @Query("SELECT COUNT(pm) FROM ProjectMember pm WHERE pm.projectId = :projectId")
    long countByProjectId(@Param("projectId") String projectId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.userId = :userId AND pm.role = 'OWNER'")
    List<ProjectMember> findOwnedProjectsByUserId(@Param("userId") Long userId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.userId = :userId AND pm.role != 'OWNER'")
    List<ProjectMember> findSharedProjectsByUserId(@Param("userId") Long userId);

    @Query("SELECT CASE WHEN COUNT(pm) > 0 THEN true ELSE false END FROM ProjectMember pm " +
           "WHERE pm.projectId = :projectId AND pm.userId = :userId")
    boolean existsByProjectIdAndUserId(@Param("projectId") String projectId, @Param("userId") Long userId);
}
