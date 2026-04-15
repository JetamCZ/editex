-- Migrate file_branches id from UUID VARCHAR to INTEGER BIGINT
-- and update all FK references

-- Step 1: Create new file_branches with INTEGER id, keeping old UUID for mapping
CREATE TABLE file_branches_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    old_uuid VARCHAR(36) NOT NULL,
    file_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    source_branch_old_uuid VARCHAR(36),
    created_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    deleted_at DATETIME,
    FOREIGN KEY (file_id) REFERENCES project_files(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

INSERT INTO file_branches_new (old_uuid, file_id, name, source_branch_old_uuid, created_by, created_at, deleted_at)
SELECT id, file_id, name, source_branch_id, created_by, created_at, deleted_at
FROM file_branches;

-- Step 2: Add source_branch_id as INTEGER
ALTER TABLE file_branches_new ADD COLUMN source_branch_id INTEGER;
UPDATE file_branches_new AS fb
SET source_branch_id = (
    SELECT n.id FROM file_branches_new n WHERE n.old_uuid = fb.source_branch_old_uuid
)
WHERE fb.source_branch_old_uuid IS NOT NULL;

-- Step 3: Rebuild project_files with active_branch_id as INTEGER
CREATE TABLE project_files_new (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    project_id INTEGER NOT NULL,
    project_folder VARCHAR(1024) NOT NULL,
    folder_id INTEGER,
    file_name VARCHAR(512) NOT NULL,
    original_file_name VARCHAR(512) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(255),
    s3_url TEXT NOT NULL,
    uploaded_by INTEGER NOT NULL,
    active_branch_id INTEGER,
    created_at DATETIME NOT NULL,
    deleted_at DATETIME,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (folder_id) REFERENCES project_folders(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

INSERT INTO project_files_new (id, project_id, project_folder, folder_id, file_name, original_file_name, file_size, file_type, s3_url, uploaded_by, active_branch_id, created_at, deleted_at)
SELECT pf.id, pf.project_id, pf.project_folder, pf.folder_id, pf.file_name, pf.original_file_name, pf.file_size, pf.file_type, pf.s3_url, pf.uploaded_by,
    (SELECT n.id FROM file_branches_new n WHERE n.old_uuid = pf.active_branch_id),
    pf.created_at, pf.deleted_at
FROM project_files pf;

-- Step 4: Rebuild document_changes with branch_id as INTEGER
CREATE TABLE document_changes_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id VARCHAR(36) NOT NULL,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(255),
    operation VARCHAR(50) NOT NULL,
    line_number INTEGER NOT NULL,
    content TEXT,
    branch_id INTEGER,
    base_change_id INTEGER,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (file_id) REFERENCES project_files_new(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO document_changes_new (id, file_id, user_id, session_id, operation, line_number, content, branch_id, base_change_id, created_at)
SELECT dc.id, dc.file_id, dc.user_id, dc.session_id, dc.operation, dc.line_number, dc.content,
    (SELECT n.id FROM file_branches_new n WHERE n.old_uuid = dc.branch_id),
    dc.base_change_id, dc.created_at
FROM document_changes dc;

-- Step 5: Rebuild file_commits with branch_id as INTEGER
CREATE TABLE file_commits_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    hash VARCHAR(8) NOT NULL,
    last_change_id INTEGER,
    message VARCHAR(500),
    committed_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES file_branches_new(id),
    FOREIGN KEY (committed_by) REFERENCES users(id)
);

INSERT INTO file_commits_new (id, branch_id, hash, last_change_id, message, committed_by, created_at)
SELECT fc.id,
    (SELECT n.id FROM file_branches_new n WHERE n.old_uuid = fc.branch_id),
    fc.hash, fc.last_change_id, fc.message, fc.committed_by, fc.created_at
FROM file_commits fc;

-- Step 6: Drop old tables
DROP TABLE file_commits;
DROP TABLE document_changes;
DROP TABLE project_files;
DROP TABLE file_branches;

-- Step 7: Rename new tables
ALTER TABLE file_commits_new RENAME TO file_commits;
ALTER TABLE document_changes_new RENAME TO document_changes;
ALTER TABLE project_files_new RENAME TO project_files;
ALTER TABLE file_branches_new RENAME TO file_branches;

-- Step 8: Drop temp columns and recreate final file_branches without temp columns
CREATE TABLE file_branches_final (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    source_branch_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    deleted_at DATETIME,
    FOREIGN KEY (file_id) REFERENCES project_files(id),
    FOREIGN KEY (source_branch_id) REFERENCES file_branches_final(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

INSERT INTO file_branches_final (id, file_id, name, source_branch_id, created_by, created_at, deleted_at)
SELECT id, file_id, name, source_branch_id, created_by, created_at, deleted_at
FROM file_branches;

DROP TABLE file_branches;
ALTER TABLE file_branches_final RENAME TO file_branches;

-- Recreate indexes
CREATE INDEX idx_document_changes_file_created ON document_changes(file_id, created_at);
CREATE INDEX idx_document_changes_session ON document_changes(session_id);
CREATE INDEX idx_file_commits_branch ON file_commits(branch_id);
