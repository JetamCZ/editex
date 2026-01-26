package eu.puhony.latex_editor.repository;

import eu.puhony.latex_editor.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByVerificationToken(String verificationToken);

    Optional<User> findByPasswordResetToken(String passwordResetToken);

    // Find user by email including soft-deleted ones
    @Query(value = "SELECT * FROM users WHERE email = :email", nativeQuery = true)
    Optional<User> findByEmailIncludingDeleted(@Param("email") String email);

    // Permanently delete a user (hard delete)
    @Modifying
    @Query(value = "DELETE FROM users WHERE id = :id", nativeQuery = true)
    void hardDelete(@Param("id") Long id);
}
