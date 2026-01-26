-- Extend column sizes in project_files table to handle longer values
ALTER TABLE project_files ALTER COLUMN project_folder TYPE VARCHAR(1024);
ALTER TABLE project_files ALTER COLUMN file_name TYPE VARCHAR(512);
ALTER TABLE project_files ALTER COLUMN original_file_name TYPE VARCHAR(512);
ALTER TABLE project_files ALTER COLUMN s3_url TYPE TEXT;
