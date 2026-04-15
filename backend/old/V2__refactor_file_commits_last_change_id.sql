-- Remove content column from file_commits and add last_change_id.
-- All commits now reference the latest document_change they include.
-- Branch creation and merge results are represented as REPLACE document_changes.
CREATE TABLE file_commits_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id VARCHAR(36) NOT NULL,
    hash VARCHAR(8) NOT NULL,
    last_change_id BIGINT,
    message VARCHAR(500),
    committed_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES file_branches(id),
    FOREIGN KEY (committed_by) REFERENCES users(id),
    FOREIGN KEY (last_change_id) REFERENCES document_changes(id)
);

DROP TABLE file_commits;
ALTER TABLE file_commits_new RENAME TO file_commits;

CREATE INDEX idx_file_commits_branch_id ON file_commits(branch_id);
CREATE INDEX idx_file_commits_hash ON file_commits(hash);
