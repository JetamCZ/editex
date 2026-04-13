package eu.puhony.latex_editor.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "document_changes", indexes = {
    @Index(name = "idx_file_created", columnList = "file_id,created_at"),
    @Index(name = "idx_session", columnList = "session_id")
})
public class DocumentChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false)
    private ProjectFile file;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "operation", nullable = false, length = 20)
    private String operation; // MODIFY, INSERT_AFTER, DELETE

    @Column(name = "line_number", nullable = false)
    private Integer lineNumber;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private FileBranch branch;

    @Column(name = "base_change_id")
    private Long baseChangeId; // Last change ID when this edit session started

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ProjectFile getFile() {
        return file;
    }

    public void setFile(ProjectFile file) {
        this.file = file;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public Integer getLineNumber() {
        return lineNumber;
    }

    public void setLineNumber(Integer lineNumber) {
        this.lineNumber = lineNumber;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public FileBranch getBranch() {
        return branch;
    }

    public void setBranch(FileBranch branch) {
        this.branch = branch;
    }

    public Long getBaseChangeId() {
        return baseChangeId;
    }

    public void setBaseChangeId(Long baseChangeId) {
        this.baseChangeId = baseChangeId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
