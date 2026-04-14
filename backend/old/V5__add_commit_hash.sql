-- Add hash column to file_commits for short commit references
-- SQLite requires table recreation for adding columns with constraints

CREATE TABLE file_commits_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id VARCHAR(36) NOT NULL,
    hash VARCHAR(8) NOT NULL,
    content TEXT NOT NULL,
    message VARCHAR(500),
    committed_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES file_branches(id),
    FOREIGN KEY (committed_by) REFERENCES users(id)
);

INSERT INTO file_commits_new (id, branch_id, hash, content, message, committed_by, created_at)
SELECT id, branch_id, lower(hex(randomblob(4))), content, message, committed_by, created_at
FROM file_commits;

DROP TABLE file_commits;
ALTER TABLE file_commits_new RENAME TO file_commits;

CREATE INDEX idx_file_commits_branch_id ON file_commits(branch_id);
CREATE INDEX idx_file_commits_hash ON file_commits(hash);
