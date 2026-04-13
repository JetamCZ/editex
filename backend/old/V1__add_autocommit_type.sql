-- Migration to add AUTOCOMMIT type to commits table
-- SQLite doesn't support ALTER TABLE to modify CHECK constraints,
-- so we need to recreate the table with the updated constraint

-- Step 0: Clean up any leftover from failed migration
DROP TABLE IF EXISTS commits_new;

-- Step 1: Create new table with updated CHECK constraint
CREATE TABLE commits_new (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    base_project VARCHAR(36) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    type VARCHAR(12) NOT NULL CHECK (type IN ('SPLIT', 'MERGE', 'COMMIT', 'AUTOCOMMIT')),
    source_branch VARCHAR(255),
    target_branch VARCHAR(255),
    message TEXT,
    last_change_id VARCHAR(36),
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Step 2: Copy data from old table using explicit column names
INSERT INTO commits_new (id, base_project, branch, type, source_branch, target_branch, message, last_change_id, created_by, created_at)
SELECT id, base_project, branch, type, source_branch, target_branch, message, last_change_id, created_by, created_at FROM commits;

-- Step 3: Drop old table
DROP TABLE commits;

-- Step 4: Rename new table
ALTER TABLE commits_new RENAME TO commits;

-- Step 5: Recreate indexes
CREATE INDEX idx_commit_base_project ON commits(base_project);
CREATE INDEX idx_commit_branch ON commits(base_project, branch);
CREATE INDEX idx_commit_created_at ON commits(created_at);
