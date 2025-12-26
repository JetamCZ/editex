package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.dto.CompilationResult;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.exception.LatexCompilationException;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.io.FileUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class LatexCompilationService {

    private final MinioService minioService;
    private final FileService fileService;
    private final ProjectMemberService projectMemberService;
    private final ProjectFileRepository projectFileRepository;
    private final UserRepository userRepository;
    private final DocumentChangeService documentChangeService;

    @Value("${latex.temp.directory:/tmp/latex-compilations}")
    private String tempDirectory;

    @Value("${latex.compiler.timeout:30}")
    private int compilerTimeoutSeconds;

    @Value("${latex.compiler.path:pdflatex}")
    private String compilerPath;

    public CompilationResult compileLatex(String fileId, Long userId) throws Exception {
        long startTime = System.currentTimeMillis();
        File workDir = null;

        try {
            // 1. Validate permissions and get file
            ProjectFile sourceFile = projectFileRepository.findByIdNonDeleted(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            projectMemberService.ensureCanRead(sourceFile.getProject().getId(), userId);

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // 2. Create temp directory
            workDir = createCompilationDirectory();

            // 3. Download all project files (with changes applied for .tex files)
            downloadProjectDependencies(sourceFile.getProject().getId(), workDir, userId);

            // 4. Find main .tex file
            String mainTexFile = findMainTexFile(workDir, sourceFile.getOriginalFileName());

            // 5. Execute pdflatex
            CompilationResult result = executePdfLatex(workDir, mainTexFile);

            // 6. If successful, upload PDF to S3
            if (result.isSuccess()) {
                String pdfFileName = mainTexFile.replace(".tex", ".pdf");
                File pdfFile = new File(workDir, pdfFileName);

                if (pdfFile.exists()) {
                    ProjectFile savedPdf = fileService.saveGeneratedPdf(
                        pdfFile,
                        sourceFile.getProject(),
                        sourceFile.getId(),
                        user
                    );
                    result.setPdfFileId(savedPdf.getId());
                    result.setPdfUrl(savedPdf.getS3Url());
                } else {
                    result.setSuccess(false);
                    result.setErrorMessage("PDF file was not generated");
                }
            }

            // Set compilation time
            result.setCompilationTimeMs(System.currentTimeMillis() - startTime);

            return result;

        } finally {
            // 7. Cleanup temp directory
            if (workDir != null) {
                System.out.println("=== CLEANING UP TEMP DIRECTORY ===");
                System.out.println("Location: " + workDir.getAbsolutePath());
                cleanupDirectory(workDir);
            }
        }
    }

    private File createCompilationDirectory() throws IOException {
        Path tempDirPath = Path.of(tempDirectory);
        if (!Files.exists(tempDirPath)) {
            Files.createDirectories(tempDirPath);
        }

        String uniqueDirName = "latex-" + UUID.randomUUID().toString();
        File workDir = new File(tempDirPath.toFile(), uniqueDirName);

        if (!workDir.mkdirs()) {
            throw new IOException("Failed to create compilation directory");
        }

        return workDir;
    }

    private void downloadProjectDependencies(String projectId, File workDir, Long userId) throws Exception {
        List<ProjectFile> projectFiles = projectFileRepository.findByProjectIdNonDeleted(projectId);

        System.out.println("=== DOWNLOADING PROJECT FILES ===");
        System.out.println("Project ID: " + projectId);
        System.out.println("Work directory: " + workDir.getAbsolutePath());
        System.out.println("Total files in project: " + projectFiles.size());

        for (ProjectFile file : projectFiles) {
            System.out.println("Processing file: " + file.getOriginalFileName() +
                             " (type: " + file.getFileType() +
                             ", folder: " + file.getProjectFolder() + ")");

            // Skip compiled PDFs
            if ("/compiled".equals(file.getProjectFolder())) {
                System.out.println("  -> Skipping (compiled PDF)");
                continue;
            }

            // Sanitize filename and download
            String sanitizedFileName = sanitizeFilename(file.getOriginalFileName());
            File destFile = new File(workDir, sanitizedFileName);

            // For .tex files, get content with changes applied
            if (sanitizedFileName.endsWith(".tex")) {
                System.out.println("  -> .tex file detected, fetching content with changes...");

                // Get original content from S3
                String originalContent = minioService.getFileContent(file.getS3Url());
                System.out.println("  -> Original content length: " + originalContent.length() + " chars");

                // Get all changes for this file
                List<DocumentChange> changes = documentChangeService.getFileChanges(file.getId(), userId);
                System.out.println("  -> Found " + changes.size() + " document changes");

                // Apply changes to get current content
                String currentContent = documentChangeService.applyChangesToContent(originalContent, changes);
                System.out.println("  -> Current content length: " + currentContent.length() + " chars");

                // Write current content to file
                Files.writeString(destFile.toPath(), currentContent, StandardCharsets.UTF_8);
                System.out.println("  -> Written to disk, size: " + destFile.length() + " bytes");
            } else {
                // For non-.tex files (images, etc.), download directly from S3
                System.out.println("  -> Non-.tex file, downloading from S3...");
                String objectName = minioService.getObjectNameFromUrl(file.getS3Url());
                System.out.println("  -> S3 object name: " + objectName);
                System.out.println("  -> Destination: " + destFile.getAbsolutePath());

                if (objectName != null) {
                    minioService.downloadFileToPath(objectName, destFile);
                    System.out.println("  -> Downloaded successfully, size: " + destFile.length() + " bytes");
                } else {
                    System.out.println("  -> ERROR: Could not extract object name from URL: " + file.getS3Url());
                }
            }
        }

        // List all files in work directory after download
        System.out.println("\n=== FILES IN WORK DIRECTORY ===");
        File[] downloadedFiles = workDir.listFiles();
        if (downloadedFiles != null) {
            for (File f : downloadedFiles) {
                System.out.println("  " + f.getName() + " (" + f.length() + " bytes)");
            }
        } else {
            System.out.println("  No files found!");
        }
        System.out.println("=================================\n");
    }

    private String findMainTexFile(File workDir, String requestedFileName) throws IOException {
        System.out.println("=== FINDING MAIN TEX FILE ===");
        System.out.println("Requested filename: " + requestedFileName);

        File[] files = workDir.listFiles((dir, name) -> name.endsWith(".tex"));

        if (files == null || files.length == 0) {
            System.out.println("ERROR: No .tex files found!");
            throw new LatexCompilationException(
                "No .tex files found in project",
                "No .tex files available for compilation"
            );
        }

        System.out.println("Found " + files.length + " .tex file(s):");
        for (File f : files) {
            System.out.println("  - " + f.getName());
        }

        // If requested file exists and is .tex, use it
        String sanitizedRequested = sanitizeFilename(requestedFileName);
        System.out.println("Sanitized requested: " + sanitizedRequested);

        if (sanitizedRequested.endsWith(".tex")) {
            File requestedFile = new File(workDir, sanitizedRequested);
            if (requestedFile.exists()) {
                System.out.println("Using requested file: " + sanitizedRequested);
                return sanitizedRequested;
            } else {
                System.out.println("Requested file does not exist: " + sanitizedRequested);
            }
        }

        // Search for file with \documentclass
        System.out.println("Searching for file with \\documentclass...");
        for (File file : files) {
            try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.startsWith("\\documentclass")) {
                        System.out.println("Found \\documentclass in: " + file.getName());
                        return file.getName();
                    }
                }
            }
        }

        // Fallback: use first .tex file
        System.out.println("No \\documentclass found, using first file: " + files[0].getName());
        return files[0].getName();
    }

    private CompilationResult executePdfLatex(File workDir, String mainTexFile) throws Exception {
        System.out.println("=== EXECUTING PDFLATEX ===");
        System.out.println("Main file: " + mainTexFile);
        System.out.println("Work directory: " + workDir.getAbsolutePath());
        System.out.println("Compiler path: " + compilerPath);

        CompilationResult result = new CompilationResult();
        StringBuilder logBuilder = new StringBuilder();

        try {
            ProcessBuilder pb = new ProcessBuilder(
                compilerPath,
                "-interaction=nonstopmode",
                "-halt-on-error",
                mainTexFile
            );
            pb.directory(workDir);
            pb.redirectErrorStream(true); // Merge stderr into stdout

            System.out.println("Starting pdflatex process...");
            Process process = pb.start();

            // Read output
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    logBuilder.append(line).append("\n");
                }
            }

            // Wait for completion with timeout
            boolean completed = process.waitFor(compilerTimeoutSeconds, TimeUnit.SECONDS);

            if (!completed) {
                process.destroyForcibly();
                result.setSuccess(false);
                result.setErrorMessage("Compilation timed out after " + compilerTimeoutSeconds + " seconds");
                result.setCompilationLog(logBuilder.toString());
                return result;
            }

            int exitCode = process.exitValue();
            result.setCompilationLog(logBuilder.toString());

            if (exitCode == 0) {
                result.setSuccess(true);
            } else {
                result.setSuccess(false);
                result.setErrorMessage("LaTeX compilation failed with exit code " + exitCode);
            }

        } catch (IOException e) {
            result.setSuccess(false);
            result.setErrorMessage("Failed to run pdflatex: " + e.getMessage() +
                                   ". Make sure LaTeX is installed on the server.");
            result.setCompilationLog(logBuilder.toString());
        }

        return result;
    }

    private void cleanupDirectory(File directory) {
        try {
            FileUtils.deleteDirectory(directory);
        } catch (IOException e) {
            System.err.println("Failed to cleanup compilation directory: " + e.getMessage());
        }
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) {
            return "unknown";
        }
        // Remove any directory traversal attempts and keep only safe characters
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
