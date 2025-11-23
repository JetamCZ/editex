package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.ProjectInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectInvitationRepository extends JpaRepository<ProjectInvitation, String> {

    @Query("SELECT pi FROM ProjectInvitation pi WHERE pi.invitedUserId = :userId AND pi.status = 'PENDING'")
    List<ProjectInvitation> findPendingInvitationsByUserId(@Param("userId") Long userId);

    @Query("SELECT pi FROM ProjectInvitation pi WHERE pi.projectId = :projectId AND pi.status = 'PENDING'")
    List<ProjectInvitation> findPendingInvitationsByProjectId(@Param("projectId") String projectId);

    @Query("SELECT pi FROM ProjectInvitation pi WHERE pi.projectId = :projectId AND pi.invitedUserId = :userId")
    List<ProjectInvitation> findByProjectIdAndUserId(@Param("projectId") String projectId, @Param("userId") Long userId);

    @Query("SELECT pi FROM ProjectInvitation pi WHERE pi.projectId = :projectId AND pi.invitedUserId = :userId AND pi.status = 'PENDING'")
    Optional<ProjectInvitation> findPendingInvitation(@Param("projectId") String projectId, @Param("userId") Long userId);

    @Query("SELECT CASE WHEN COUNT(pi) > 0 THEN true ELSE false END FROM ProjectInvitation pi " +
           "WHERE pi.projectId = :projectId AND pi.invitedUserId = :userId AND pi.status = 'PENDING'")
    boolean hasPendingInvitation(@Param("projectId") String projectId, @Param("userId") Long userId);
}
