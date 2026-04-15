-- Migrate project_folders to reference projects by BIGINT id instead of base_project (VARCHAR)
CREATE TABLE project_folders_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    parent_id INTEGER,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(1024) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    deleted_at DATETIME,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (parent_id) REFERENCES project_folders_new(id)
);

INSERT INTO project_folders_new (id, project_id, parent_id, name, path, created_at, updated_at, deleted_at)
SELECT pf.id,
       p.id AS project_id,
       pf.parent_id,
       pf.name,
       pf.path,
       pf.created_at,
       pf.updated_at,
       pf.deleted_at
FROM project_folders pf
JOIN projects p ON p.base_project = pf.base_project;

DROP TABLE project_folders;
ALTER TABLE project_folders_new RENAME TO project_folders;

CREATE INDEX idx_project_folders_project_id ON project_folders(project_id);
CREATE INDEX idx_project_folders_parent ON project_folders(parent_id);
