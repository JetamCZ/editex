package eu.puhony.latex_editor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_changes", indexes = {
    @Index(name = "idx_file_created", columnList = "file_id,created_at"),
    @Index(name = "idx_file_line", columnList = "file_id,line_number")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChange {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "VARCHAR(36)")
    private UUID id;

    @Column(name = "file_id", nullable = false)
    private String fileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "line_number", nullable = false)
    private Integer lineNumber;

    @Column(name = "change_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ChangeType changeType;

    @Column(name = "old_content", columnDefinition = "TEXT")
    private String oldContent;

    @Column(name = "new_content", columnDefinition = "TEXT")
    private String newContent;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    public enum ChangeType {
        INSERT,      // New line inserted
        DELETE,      // Line deleted
        MODIFY,      // Line content modified
        REPLACE      // Multiple lines replaced
    }
}
