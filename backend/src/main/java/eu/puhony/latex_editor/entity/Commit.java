package eu.puhony.latex_editor.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "commits", indexes = {
    @Index(name = "idx_commit_base_project", columnList = "base_project"),
    @Index(name = "idx_commit_branch", columnList = "base_project,branch"),
    @Index(name = "idx_commit_created_at", columnList = "created_at")
})
public class Commit {

    public enum Type {
        SPLIT,   // Created when a branch is created
        MERGE,   // Created when branches are merged
        COMMIT   // User-created label/snapshot
    }

    @Id
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private String id;

    @Column(name = "base_project", nullable = false, length = 36)
    private String baseProject;

    @Column(name = "branch", nullable = false)
    private String branch;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 10)
    private Type type;

    @Column(name = "source_branch")
    private String sourceBranch; // For SPLIT: the parent branch; For MERGE: the branch being merged

    @Column(name = "target_branch")
    private String targetBranch; // For MERGE: the branch receiving the merge

    @Column(name = "message")
    private String message; // User-provided message for COMMIT type

    @Column(name = "last_change_id")
    private String lastChangeId; // For COMMIT type: references the last DocumentChange at snapshot time

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getBaseProject() {
        return baseProject;
    }

    public void setBaseProject(String baseProject) {
        this.baseProject = baseProject;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public String getSourceBranch() {
        return sourceBranch;
    }

    public void setSourceBranch(String sourceBranch) {
        this.sourceBranch = sourceBranch;
    }

    public String getTargetBranch() {
        return targetBranch;
    }

    public void setTargetBranch(String targetBranch) {
        this.targetBranch = targetBranch;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getLastChangeId() {
        return lastChangeId;
    }

    public void setLastChangeId(String lastChangeId) {
        this.lastChangeId = lastChangeId;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
