-- Remove commits table and branching-related data

-- Step 1: Drop the commits table
DROP TABLE IF EXISTS commits;

-- Step 2: Clean up non-main branch data (FK order: document_changes -> project_files -> projects)
DELETE FROM document_changes WHERE file_id IN (
    SELECT pf.id FROM project_files pf
    JOIN projects p ON pf.project_id = p.id
    WHERE p.branch != 'main'
);

DELETE FROM project_files WHERE project_id IN (
    SELECT id FROM projects WHERE branch != 'main'
);

DELETE FROM projects WHERE branch != 'main';

-- Step 3: Remove source_branch column from projects
-- SQLite requires table recreation to drop a column
CREATE TABLE projects_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base_project VARCHAR(36) NOT NULL,
    branch VARCHAR(255) NOT NULL DEFAULT 'main',
    name VARCHAR(255) NOT NULL,
    owner_id BIGINT NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    UNIQUE (base_project, branch)
);

INSERT INTO projects_new (id, base_project, branch, name, owner_id, deleted_at, created_at, updated_at)
SELECT id, base_project, branch, name, owner_id, deleted_at, created_at, updated_at
FROM projects;

DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;

CREATE INDEX idx_projects_base_project ON projects(base_project);
CREATE INDEX idx_projects_owner ON projects(owner_id);
