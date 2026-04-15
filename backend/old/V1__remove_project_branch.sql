-- Remove branch column from projects table (was always 'main')
CREATE TABLE projects_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base_project VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    owner_id INTEGER NOT NULL,
    deleted_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    CONSTRAINT uq_projects_base_project UNIQUE (base_project),
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

INSERT INTO projects_new (id, base_project, name, owner_id, deleted_at, created_at, updated_at)
SELECT id, base_project, name, owner_id, deleted_at, created_at, updated_at
FROM projects;

DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;
