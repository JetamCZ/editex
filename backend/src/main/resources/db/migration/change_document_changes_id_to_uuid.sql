-- Change document_changes.id from BIGINT to VARCHAR(36) for UUID
-- SQLite requires table recreation to change column types

-- Step 1: Create new table with UUID id
CREATE TABLE document_changes_new (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    file_id VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    line_number INTEGER NOT NULL,
    change_type VARCHAR(20) NOT NULL,
    old_content TEXT,
    new_content TEXT,
    session_id VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Step 2: Copy existing data with generated UUIDs
-- Note: This generates new UUIDs for existing records
INSERT INTO document_changes_new (id, file_id, user_id, line_number, change_type, old_content, new_content, session_id, created_at)
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) as id,
    file_id,
    user_id,
    line_number,
    change_type,
    old_content,
    new_content,
    session_id,
    created_at
FROM document_changes;

-- Step 3: Drop old table
DROP TABLE document_changes;

-- Step 4: Rename new table
ALTER TABLE document_changes_new RENAME TO document_changes;

-- Step 5: Recreate indexes
CREATE INDEX idx_file_created ON document_changes(file_id, created_at);
CREATE INDEX idx_file_line ON document_changes(file_id, line_number);
