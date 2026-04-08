-- File-level branching support

-- Table 1: file_branches - branches per file
CREATE TABLE file_branches (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    file_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    source_branch_id VARCHAR(36),
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES project_files(id),
    FOREIGN KEY (source_branch_id) REFERENCES file_branches(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(file_id, name)
);

CREATE INDEX idx_file_branches_file_id ON file_branches(file_id);

-- Table 2: file_commits - content snapshots per branch
CREATE TABLE file_commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    message VARCHAR(500),
    committed_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES file_branches(id),
    FOREIGN KEY (committed_by) REFERENCES users(id)
);

CREATE INDEX idx_file_commits_branch_id ON file_commits(branch_id);

-- Add branch_id to document_changes (SQLite requires table recreation)
CREATE TABLE document_changes_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36),
    user_id BIGINT NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    line_number INTEGER NOT NULL,
    content TEXT,
    base_change_id BIGINT,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (file_id) REFERENCES project_files(id),
    FOREIGN KEY (branch_id) REFERENCES file_branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO document_changes_new (id, file_id, branch_id, user_id, session_id, operation, line_number, content, base_change_id, created_at)
SELECT id, file_id, NULL, user_id, session_id, operation, line_number, content, base_change_id, created_at
FROM document_changes
ORDER BY id;

DROP TABLE document_changes;
ALTER TABLE document_changes_new RENAME TO document_changes;

CREATE INDEX idx_dc_file_created ON document_changes(file_id, created_at);
CREATE INDEX idx_dc_session ON document_changes(session_id);
CREATE INDEX idx_dc_branch ON document_changes(branch_id);

-- Add active_branch_id to project_files (SQLite requires table recreation)
CREATE TABLE project_files_new (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    project_id BIGINT NOT NULL,
    project_folder VARCHAR(1024) NOT NULL,
    file_name VARCHAR(512) NOT NULL,
    original_file_name VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(255),
    s3_url TEXT NOT NULL,
    uploaded_by BIGINT NOT NULL,
    active_branch_id VARCHAR(36),
    created_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    FOREIGN KEY (active_branch_id) REFERENCES file_branches(id)
);

INSERT INTO project_files_new (id, project_id, project_folder, file_name, original_file_name, file_size, file_type, s3_url, uploaded_by, active_branch_id, created_at, deleted_at)
SELECT id, project_id, project_folder, file_name, original_file_name, file_size, file_type, s3_url, uploaded_by, NULL, created_at, deleted_at
FROM project_files;

DROP TABLE project_files;
ALTER TABLE project_files_new RENAME TO project_files;
