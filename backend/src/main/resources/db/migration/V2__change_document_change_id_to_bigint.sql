-- Migration to change document_changes.id from UUID to BIGINT auto-increment
-- This fixes the sorting issue where changes with the same timestamp had undefined order
-- SQLite doesn't support ALTER TABLE to modify column types, so we recreate the tables

-- ============================================
-- Step 1: Recreate document_changes table
-- ============================================

-- Clean up any leftover from failed migration
DROP TABLE IF EXISTS document_changes_new;

-- Create new table with BIGINT auto-increment id
CREATE TABLE document_changes_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id VARCHAR(36) NOT NULL,
    user_id BIGINT NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    line_number INTEGER NOT NULL,
    content TEXT,
    base_change_id BIGINT,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (file_id) REFERENCES project_files(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Copy data from old table (id will be auto-assigned in order of created_at)
-- We order by created_at, then by old id to maintain consistent ordering
INSERT INTO document_changes_new (file_id, user_id, session_id, operation, line_number, content, created_at)
SELECT file_id, user_id, session_id, operation, line_number, content, created_at
FROM document_changes
ORDER BY created_at ASC, id ASC;

-- Drop old table
DROP TABLE document_changes;

-- Rename new table
ALTER TABLE document_changes_new RENAME TO document_changes;

-- Recreate indexes
CREATE INDEX idx_file_created ON document_changes(file_id, created_at);
CREATE INDEX idx_session ON document_changes(session_id);

-- ============================================
-- Step 2: Recreate commits table with BIGINT last_change_id
-- ============================================

DROP TABLE IF EXISTS commits_new;

CREATE TABLE commits_new (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    base_project VARCHAR(36) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    type VARCHAR(12) NOT NULL CHECK (type IN ('SPLIT', 'MERGE', 'COMMIT', 'AUTOCOMMIT')),
    source_branch VARCHAR(255),
    target_branch VARCHAR(255),
    message TEXT,
    last_change_id BIGINT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Copy data - last_change_id will be NULL since old UUIDs don't map to new IDs
-- This is acceptable as commits created before this migration won't have valid references
INSERT INTO commits_new (id, base_project, branch, type, source_branch, target_branch, message, last_change_id, created_by, created_at)
SELECT id, base_project, branch, type, source_branch, target_branch, message, NULL, created_by, created_at FROM commits;

DROP TABLE commits;

ALTER TABLE commits_new RENAME TO commits;

-- Recreate indexes
CREATE INDEX idx_commit_base_project ON commits(base_project);
CREATE INDEX idx_commit_branch ON commits(base_project, branch);
CREATE INDEX idx_commit_created_at ON commits(created_at);
