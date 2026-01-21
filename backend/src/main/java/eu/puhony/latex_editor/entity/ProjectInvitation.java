package eu.puhony.latex_editor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "project_invitations", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"base_project", "invited_user_id"})
})
@SQLDelete(sql = "UPDATE project_invitations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectInvitation {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "base_project", nullable = false, length = 36)
    private String baseProject;

    @Column(name = "invited_user_id", nullable = false)
    private Long invitedUserId;

    @ManyToOne
    @JoinColumn(name = "invited_user_id", insertable = false, updatable = false)
    private User invitedUser;

    @Column(name = "invited_by", nullable = false)
    private Long invitedBy;

    @ManyToOne
    @JoinColumn(name = "invited_by", insertable = false, updatable = false)
    private User inviter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectMember.Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    public enum Status {
        PENDING,
        ACCEPTED,
        DECLINED
    }

    @PrePersist
    public void generateId() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
