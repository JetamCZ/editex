package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.FolderPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderPermissionRepository extends JpaRepository<FolderPermission, Long> {

    @Query("SELECT p FROM FolderPermission p WHERE p.folder.id = :folderId AND p.deletedAt IS NULL")
    List<FolderPermission> findByFolderId(@Param("folderId") Long folderId);

    @Query("SELECT p FROM FolderPermission p WHERE p.folder.id = :folderId AND p.user.id = :userId AND p.deletedAt IS NULL")
    Optional<FolderPermission> findByFolderAndUser(@Param("folderId") Long folderId, @Param("userId") Long userId);

    @Query("SELECT p FROM FolderPermission p WHERE p.folder.project.id = :projectId AND p.user.id = :userId AND p.deletedAt IS NULL")
    List<FolderPermission> findByProjectIdAndUser(@Param("projectId") Long projectId, @Param("userId") Long userId);

    @Query("SELECT p FROM FolderPermission p WHERE p.folder.project.id = :projectId AND p.deletedAt IS NULL")
    List<FolderPermission> findByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT DISTINCT p.folder.project.id FROM FolderPermission p WHERE p.user.id = :userId AND p.deletedAt IS NULL")
    List<Long> findProjectIdsForUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(p) FROM FolderPermission p WHERE p.folder.id = :folderId AND p.role = eu.puhony.latex_editor.entity.FolderRole.MANAGER AND p.deletedAt IS NULL")
    long countManagersOnFolder(@Param("folderId") Long folderId);
}
