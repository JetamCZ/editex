-- Drop legacy project_members table (replaced by folder_permissions which reference project_id BIGINT)
DROP TABLE IF EXISTS project_members;
