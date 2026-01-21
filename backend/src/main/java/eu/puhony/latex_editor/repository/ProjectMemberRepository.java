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

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.baseProject = :baseProject")
    List<ProjectMember> findByBaseProject(@Param("baseProject") String baseProject);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.userId = :userId")
    List<ProjectMember> findByUserId(@Param("userId") Long userId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.baseProject = :baseProject AND pm.userId = :userId")
    Optional<ProjectMember> findByBaseProjectAndUserId(@Param("baseProject") String baseProject, @Param("userId") Long userId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.baseProject = :baseProject AND pm.role = 'OWNER'")
    Optional<ProjectMember> findOwnerByBaseProject(@Param("baseProject") String baseProject);

    @Query("SELECT COUNT(pm) FROM ProjectMember pm WHERE pm.baseProject = :baseProject")
    long countByBaseProject(@Param("baseProject") String baseProject);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.userId = :userId AND pm.role = 'OWNER'")
    List<ProjectMember> findOwnedProjectsByUserId(@Param("userId") Long userId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.userId = :userId AND pm.role != 'OWNER'")
    List<ProjectMember> findSharedProjectsByUserId(@Param("userId") Long userId);

    @Query("SELECT CASE WHEN COUNT(pm) > 0 THEN true ELSE false END FROM ProjectMember pm " +
           "WHERE pm.baseProject = :baseProject AND pm.userId = :userId")
    boolean existsByBaseProjectAndUserId(@Param("baseProject") String baseProject, @Param("userId") Long userId);
}
