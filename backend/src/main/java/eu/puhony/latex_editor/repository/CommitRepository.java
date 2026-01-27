package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.Commit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommitRepository extends JpaRepository<Commit, String> {

    @Query("SELECT c FROM Commit c WHERE c.baseProject = :baseProject ORDER BY c.createdAt DESC, " +
           "CASE c.type WHEN 'SPLIT' THEN 1 WHEN 'MERGE' THEN 2 WHEN 'COMMIT' THEN 3 WHEN 'AUTOCOMMIT' THEN 4 END ASC")
    List<Commit> findByBaseProjectOrderByCreatedAtDesc(@Param("baseProject") String baseProject);

    @Query("SELECT c FROM Commit c WHERE c.baseProject = :baseProject AND c.branch = :branch ORDER BY c.createdAt DESC, " +
           "CASE c.type WHEN 'SPLIT' THEN 1 WHEN 'MERGE' THEN 2 WHEN 'COMMIT' THEN 3 WHEN 'AUTOCOMMIT' THEN 4 END ASC")
    List<Commit> findByBaseProjectAndBranchOrderByCreatedAtDesc(
            @Param("baseProject") String baseProject,
            @Param("branch") String branch
    );

    @Query("SELECT c FROM Commit c WHERE c.id = :id")
    Optional<Commit> findById(@Param("id") String id);

    @Query("SELECT c FROM Commit c WHERE c.baseProject = :baseProject AND c.type = :type ORDER BY c.createdAt DESC")
    List<Commit> findByBaseProjectAndType(
            @Param("baseProject") String baseProject,
            @Param("type") Commit.Type type
    );

    @Query("SELECT c FROM Commit c WHERE c.baseProject = :baseProject AND c.branch = :branch AND (c.type = 'COMMIT' OR c.type = 'AUTOCOMMIT') ORDER BY c.createdAt DESC, " +
           "CASE c.type WHEN 'COMMIT' THEN 1 WHEN 'AUTOCOMMIT' THEN 2 END ASC")
    List<Commit> findUserCommitsByBranch(
            @Param("baseProject") String baseProject,
            @Param("branch") String branch
    );
}
