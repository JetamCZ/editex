package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {

    @Query("SELECT p FROM Project p WHERE p.deletedAt IS NULL")
    List<Project> findAllNonDeleted();

    @Query("SELECT p FROM Project p WHERE p.id = :id AND p.deletedAt IS NULL")
    Optional<Project> findByIdNonDeleted(@Param("id") String id);

    @Query("SELECT p FROM Project p WHERE p.owner = :owner AND p.deletedAt IS NULL")
    List<Project> findByOwnerNonDeleted(@Param("owner") String owner);
}
