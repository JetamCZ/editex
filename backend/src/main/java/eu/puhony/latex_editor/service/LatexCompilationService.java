package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.dto.CompilationResult;
import eu.puhony.latex_editor.dto.ProjectVersionPdfInfo;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.FileBranch;
import eu.puhony.latex_editor.entity.FileCommit;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.repository.FileBranchRepository;
import eu.puhony.latex_editor.repository.FileCommitRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import eu.puhony.latex_editor.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.io.FileUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
public class LatexCompilationService {

    private final MinioService minioService;
    private final FolderPermissionService folderPermissionService;
    private final ProjectFileRepository projectFileRepository;
    private final ProjectRepository projectRepository;
    private final DocumentChangeService documentChangeService;
    private final FileBranchService fileBranchService;
    private final FileBranchRepository branchRepository;
    private final FileCommitRepository commitRepository;

    @Value("${latex.temp.directory:/tmp/latex-compilations}")
    private String tempDirectory;

    @Value("${latex.compiler.timeout:30}")
    private int compilerTimeoutSeconds;

    @Value("${latex.compiler.path:pdflatex}")
    private String compilerPath;

    public CompilationResult compileLatex(String baseProject, String branch, String targetFile, Long userId) throws Exception {
        long startTime = System.currentTimeMillis();
        File workDir = null;

        try {
            // 1. Validate permissions
            folderPermissionService.ensureCanReadProject(baseProject, userId);

            // Get the project to find the numeric ID
            Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
                    .orElseThrow(() -> new RuntimeException("Project not found"));

            // 2. Create temp directory
            workDir = createCompilationDirectory();

            // 3. Download all project files (with changes applied for .tex files)
            downloadProjectDependencies(project.getId(), workDir, userId);

            // 3b. Resolve \input{file@branch} and \input{file#hash} references
            resolveInputReferences(project.getId(), workDir);

            // 4. Resolve target file (default to main.tex if null/empty)
            String mainTexFile = resolveTargetFile(targetFile, workDir);

            // 5. Execute pdflatex
            CompilationResult result = executePdfLatex(workDir, mainTexFile);

            // Set source file in result
            result.setSourceFile(mainTexFile);

            // 6. If successful, upload PDF to S3 (without creating ProjectFile)
            if (result.isSuccess()) {
                // Derive PDF name from source file
                String baseName = mainTexFile.replaceAll("\\.tex$", "");
                String localPdfFileName = baseName + ".pdf";
                File pdfFile = new File(workDir, localPdfFileName);

                if (pdfFile.exists()) {
                    // Upload PDF with name derived from source (overwrites previous version)
                    String s3Folder = baseProject + "/" + branch + "/compiled";
                    String s3PdfFileName = baseName + ".pdf";

                    System.out.println("Uploading PDF to S3:");
                    System.out.println("  Folder: " + s3Folder);
                    System.out.println("  Filename: " + s3PdfFileName);

                    String pdfUrl = minioService.uploadFileWithName(pdfFile, s3Folder, s3PdfFileName, "application/pdf");

                    result.setPdfFileId(null); // No ProjectFile created
                    result.setPdfUrl(pdfUrl);

                    System.out.println("  PDF URL: " + pdfUrl);
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

    /**
     * Returns all saved commits of main.tex (on its "main" file-branch) for a given project,
     * along with a presigned PDF URL if that commit has already been compiled.
     */
    public List<ProjectVersionPdfInfo> getProjectVersionPdfs(String baseProject, String branch, Long userId) {
        folderPermissionService.ensureCanReadProject(baseProject, userId);

        Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Find main.tex
        List<ProjectFile> files = projectFileRepository.findByProjectIdNonDeleted(project.getId());
        ProjectFile mainTexFile = files.stream()
                .filter(f -> f.getOriginalFileName().equalsIgnoreCase("main.tex"))
                .findFirst()
                .orElse(null);

        if (mainTexFile == null) return Collections.emptyList();

        // Find "main" file-branch of main.tex
        Optional<FileBranch> mainBranch = branchRepository.findByFileIdAndNameNonDeleted(mainTexFile.getId(), "main");
        if (mainBranch.isEmpty()) return Collections.emptyList();

        List<FileCommit> commits = commitRepository.findByBranchIdOrderByIdDesc(mainBranch.get().getId());

        List<ProjectVersionPdfInfo> result = new ArrayList<>();
        for (FileCommit commit : commits) {
            String pdfObjectName = baseProject + "/" + branch + "/compiled/commits/" + commit.getHash() + ".pdf";
            boolean hasPdf = minioService.objectExists(pdfObjectName);
            String pdfUrl = hasPdf ? minioService.getFileUrl(pdfObjectName) : null;
            result.add(new ProjectVersionPdfInfo(commit.getHash(), commit.getMessage(), commit.getCreatedAt(), hasPdf, pdfUrl));
        }

        return result;
    }

    /**
     * Compile a specific commit of main.tex with all imports resolved to their state
     * at that commit's timestamp, ensuring a fully consistent PDF snapshot.
     */
    public CompilationResult compileLatexAtCommit(String baseProject, String branch, String commitHash, Long userId) throws Exception {
        long startTime = System.currentTimeMillis();
        File workDir = null;

        try {
            folderPermissionService.ensureCanReadProject(baseProject, userId);

            Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
                    .orElseThrow(() -> new RuntimeException("Project not found"));

            FileCommit targetCommit = commitRepository.findByHashAndProjectId(commitHash, project.getId())
                    .orElseThrow(() -> new RuntimeException("Commit not found: " + commitHash));

            LocalDateTime commitTime = targetCommit.getCreatedAt();
            String targetFileId = targetCommit.getBranch().getFile().getId();

            workDir = createCompilationDirectory();

            // Write all project files at the exact commit timestamp
            downloadProjectFilesAtCommit(project.getId(), workDir, targetCommit, targetFileId, commitTime);

            // Resolve any \input{file@branch} references using time-consistent content
            resolveInputReferencesAtTime(project.getId(), workDir, commitTime);

            CompilationResult result = executePdfLatex(workDir, "main.tex");
            result.setSourceFile("main.tex");

            if (result.isSuccess()) {
                File pdfFile = new File(workDir, "main.pdf");
                if (pdfFile.exists()) {
                    String s3Folder = baseProject + "/" + branch + "/compiled/commits";
                    String pdfUrl = minioService.uploadFileWithName(pdfFile, s3Folder, commitHash + ".pdf", "application/pdf");
                    result.setPdfFileId(null);
                    result.setPdfUrl(pdfUrl);
                } else {
                    result.setSuccess(false);
                    result.setErrorMessage("PDF file was not generated");
                }
            }

            result.setCompilationTimeMs(System.currentTimeMillis() - startTime);
            return result;

        } finally {
            if (workDir != null) cleanupDirectory(workDir);
        }
    }

    /**
     * Download all project files to workDir with contents as of commitTime.
     * The specific target commit's content is used directly for its file.
     * All other .tex files are resolved to their latest commit before commitTime.
     */
    private void downloadProjectFilesAtCommit(Long projectId, File workDir, FileCommit targetCommit,
                                               String targetFileId, LocalDateTime commitTime) throws Exception {
        List<ProjectFile> projectFiles = projectFileRepository.findByProjectIdNonDeleted(projectId);

        for (ProjectFile file : projectFiles) {
            String sanitizedFileName = sanitizeFilename(file.getOriginalFileName());
            File destFile = resolveDestinationFile(workDir, file.getProjectFolder(), sanitizedFileName);

            if (sanitizedFileName.endsWith(".tex")) {
                String content;

                if (file.getId().equals(targetFileId)) {
                    // Use the exact committed snapshot for the target file (main.tex)
                    content = targetCommit.getContent();
                } else {
                    // For all other .tex files, find their "main" branch's latest commit ≤ commitTime
                    Optional<FileBranch> fileBranch = branchRepository.findByFileIdAndNameNonDeleted(file.getId(), "main");
                    if (fileBranch.isPresent()) {
                        content = commitRepository
                                .findLatestByBranchIdBefore(fileBranch.get().getId(), commitTime)
                                .map(FileCommit::getContent)
                                .orElseGet(() -> {
                                    try {
                                        return minioService.getFileContent(file.getS3Url());
                                    } catch (Exception e) {
                                        throw new RuntimeException("Error reading base content for " + file.getOriginalFileName(), e);
                                    }
                                });
                    } else if (file.getActiveBranch() != null) {
                        content = commitRepository
                                .findLatestByBranchIdBefore(file.getActiveBranch().getId(), commitTime)
                                .map(FileCommit::getContent)
                                .orElseGet(() -> {
                                    try {
                                        return minioService.getFileContent(file.getS3Url());
                                    } catch (Exception e) {
                                        throw new RuntimeException("Error reading base content for " + file.getOriginalFileName(), e);
                                    }
                                });
                    } else {
                        content = minioService.getFileContent(file.getS3Url());
                    }
                }

                Files.writeString(destFile.toPath(), content, StandardCharsets.UTF_8);
            } else {
                // Non-.tex files (images, etc.) don't have commit history — download from S3
                String objectName = minioService.getObjectNameFromUrl(file.getS3Url());
                if (objectName != null) {
                    minioService.downloadFileToPath(objectName, destFile);
                }
            }
        }
    }

    // Patterns for time-consistent \input reference resolution
    private static final Pattern INPUT_BRANCH_PATTERN_T =
            Pattern.compile("\\\\(?:input|include)\\{([^}@#]+)@([^}]+)\\}");
    private static final Pattern INPUT_COMMIT_PATTERN_T =
            Pattern.compile("\\\\(?:input|include)\\{([^}@#]+)#([^}]+)\\}");

    /**
     * Like resolveInputReferences but resolves \input{file@branch} to the latest commit
     * on that branch at or before commitTime, ensuring historical consistency.
     * \input{file#hash} references are always pinned and resolved normally.
     */
    private void resolveInputReferencesAtTime(Long projectId, File workDir, LocalDateTime commitTime) throws IOException {
        File[] texFiles = findTexFilesRecursively(workDir);
        if (texFiles == null) return;

        for (File texFile : texFiles) {
            String content = Files.readString(texFile.toPath(), StandardCharsets.UTF_8);
            String processed = content;
            boolean changed = false;

            // Resolve @branch references at commitTime
            Matcher branchMatcher = INPUT_BRANCH_PATTERN_T.matcher(processed);
            StringBuffer sb = new StringBuffer();
            while (branchMatcher.find()) {
                String filePath = branchMatcher.group(1).trim();
                String branchName = branchMatcher.group(2).trim();
                String normalizedFileName = filePath.endsWith(".tex") ? filePath : filePath + ".tex";

                String resolvedContent = fileBranchService.resolveInputReferenceAtTime(
                        projectId, normalizedFileName, branchName, commitTime);

                if (resolvedContent != null) {
                    String targetFileName = sanitizeFilename(normalizedFileName);
                    Files.writeString(new File(workDir, targetFileName).toPath(), resolvedContent, StandardCharsets.UTF_8);
                }

                String cmd = branchMatcher.group(0).contains("\\include") ? "include" : "input";
                branchMatcher.appendReplacement(sb, Matcher.quoteReplacement("\\" + cmd + "{" + filePath + "}"));
                changed = true;
            }
            branchMatcher.appendTail(sb);
            processed = sb.toString();

            // Resolve #hash references (always consistent — no time param needed)
            Matcher commitMatcher = INPUT_COMMIT_PATTERN_T.matcher(processed);
            sb = new StringBuffer();
            while (commitMatcher.find()) {
                String filePath = commitMatcher.group(1).trim();
                String hash = commitMatcher.group(2).trim();
                String normalizedFileName = filePath.endsWith(".tex") ? filePath : filePath + ".tex";

                String resolvedContent = fileBranchService.resolveInputReference(
                        projectId, normalizedFileName, hash, false);

                if (resolvedContent != null) {
                    String targetFileName = sanitizeFilename(normalizedFileName);
                    Files.writeString(new File(workDir, targetFileName).toPath(), resolvedContent, StandardCharsets.UTF_8);
                }

                String cmd = commitMatcher.group(0).contains("\\include") ? "include" : "input";
                commitMatcher.appendReplacement(sb, Matcher.quoteReplacement("\\" + cmd + "{" + filePath + "}"));
                changed = true;
            }
            commitMatcher.appendTail(sb);
            processed = sb.toString();

            if (changed) {
                Files.writeString(texFile.toPath(), processed, StandardCharsets.UTF_8);
            }
        }
    }

    public String downloadProjectAsZip(String baseProject, String branch, Long userId) throws Exception {
        File workDir = null;

        try {
            folderPermissionService.ensureCanReadProject(baseProject, userId);

            Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
                    .orElseThrow(() -> new RuntimeException("Project not found"));

            workDir = createCompilationDirectory();

            downloadProjectDependencies(project.getId(), workDir, userId);

            // Create zip file
            File zipFile = new File(workDir.getParentFile(), workDir.getName() + ".zip");
            try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipFile))) {
                addDirectoryToZip(workDir, workDir, zos);
            }

            // Upload zip to S3
            String s3Folder = baseProject + "/" + branch + "/downloads";
            String zipFileName = "project.zip";
            String zipUrl = minioService.uploadFileWithName(zipFile, s3Folder, zipFileName, "application/zip");

            // Cleanup zip file
            zipFile.delete();

            return zipUrl;
        } finally {
            if (workDir != null) {
                cleanupDirectory(workDir);
            }
        }
    }

    public String downloadProjectAtCommitAsZip(String baseProject, String branch, String commitHash, Long userId) throws Exception {
        File workDir = null;

        try {
            folderPermissionService.ensureCanReadProject(baseProject, userId);

            Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
                    .orElseThrow(() -> new RuntimeException("Project not found"));

            FileCommit targetCommit = commitRepository.findByHashAndProjectId(commitHash, project.getId())
                    .orElseThrow(() -> new RuntimeException("Commit not found: " + commitHash));

            LocalDateTime commitTime = targetCommit.getCreatedAt();
            String targetFileId = targetCommit.getBranch().getFile().getId();

            workDir = createCompilationDirectory();

            downloadProjectFilesAtCommit(project.getId(), workDir, targetCommit, targetFileId, commitTime);
            resolveInputReferencesAtTime(project.getId(), workDir, commitTime);

            File zipFile = new File(workDir.getParentFile(), workDir.getName() + ".zip");
            try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipFile))) {
                addDirectoryToZip(workDir, workDir, zos);
            }

            String s3Folder = baseProject + "/" + branch + "/downloads/commits";
            String zipFileName = commitHash + ".zip";
            String zipUrl = minioService.uploadFileWithName(zipFile, s3Folder, zipFileName, "application/zip");

            zipFile.delete();

            return zipUrl;
        } finally {
            if (workDir != null) {
                cleanupDirectory(workDir);
            }
        }
    }

    private void addDirectoryToZip(File rootDir, File currentDir, ZipOutputStream zos) throws IOException {
        File[] files = currentDir.listFiles();
        if (files == null) return;

        for (File file : files) {
            String relativePath = rootDir.toPath().relativize(file.toPath()).toString();
            if (file.isDirectory()) {
                zos.putNextEntry(new ZipEntry(relativePath + "/"));
                zos.closeEntry();
                addDirectoryToZip(rootDir, file, zos);
            } else {
                zos.putNextEntry(new ZipEntry(relativePath));
                Files.copy(file.toPath(), zos);
                zos.closeEntry();
            }
        }
    }

    /**
     * Resolve and validate the target .tex file to compile.
     * Defaults to "main.tex" if null/empty. Sanitizes to prevent path traversal.
     */
    private String resolveTargetFile(String targetFile, File workDir) {
        // Default to main.tex if not specified
        if (targetFile == null || targetFile.trim().isEmpty()) {
            return "main.tex";
        }

        // Sanitize: remove any path components (prevent path traversal)
        String sanitized = targetFile.trim();
        // Remove any directory separators
        sanitized = sanitized.replace("/", "").replace("\\", "");

        // Ensure it ends with .tex
        if (!sanitized.toLowerCase().endsWith(".tex")) {
            sanitized = sanitized + ".tex";
        }

        // Verify the file exists in the work directory
        File targetFileObj = new File(workDir, sanitized);
        if (!targetFileObj.exists()) {
            throw new RuntimeException("Target file not found: " + sanitized);
        }

        return sanitized;
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

    private void downloadProjectDependencies(Long projectId, File workDir, Long userId) throws Exception {
        List<ProjectFile> projectFiles = projectFileRepository.findByProjectIdNonDeleted(projectId);

        System.out.println("=== DOWNLOADING PROJECT FILES ===");
        System.out.println("Project ID: " + projectId);
        System.out.println("Work directory: " + workDir.getAbsolutePath());
        System.out.println("Total files in project: " + projectFiles.size());

        for (ProjectFile file : projectFiles) {
            System.out.println("Processing file: " + file.getOriginalFileName() +
                             " (type: " + file.getFileType() +
                             ", folder: " + file.getProjectFolder() + ")");

            // Sanitize filename and create proper folder structure
            String sanitizedFileName = sanitizeFilename(file.getOriginalFileName());
            File destFile = resolveDestinationFile(workDir, file.getProjectFolder(), sanitizedFileName);

            // For .tex files, get content with changes applied
            // Default: always use "main" branch. Version references (@branch, #hash) override this later.
            if (sanitizedFileName.endsWith(".tex")) {
                System.out.println("  -> .tex file detected, fetching content with changes...");

                String currentContent;
                // Try to resolve from "main" branch
                String mainContent = fileBranchService.resolveInputReference(
                        projectId, file.getOriginalFileName(), "main", true);
                if (mainContent != null) {
                    currentContent = mainContent;
                    System.out.println("  -> Resolved from branch: main");
                } else if (file.getActiveBranch() != null) {
                    // Fallback to active branch if no "main" branch exists
                    currentContent = fileBranchService.resolveContent(file.getActiveBranch());
                    System.out.println("  -> Resolved from active branch: " + file.getActiveBranch().getName());
                } else {
                    // Legacy fallback: S3 + all changes
                    String originalContent = minioService.getFileContent(file.getS3Url());
                    List<DocumentChange> changes = documentChangeService.getFileChanges(file.getId(), userId);
                    currentContent = documentChangeService.applyChangesToContent(originalContent, changes);
                    System.out.println("  -> Resolved from S3 + changes (legacy)");
                }

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

        // List all files in work directory after download (recursively)
        System.out.println("\n=== FILES IN WORK DIRECTORY ===");
        listFilesRecursively(workDir, "");
        System.out.println("=================================\n");
    }

    // Patterns: \input{file@branch} and \input{file#hash} (also \include)
    private static final Pattern INPUT_BRANCH_PATTERN =
            Pattern.compile("\\\\(?:input|include)\\{([^}@#]+)@([^}]+)\\}");
    private static final Pattern INPUT_COMMIT_PATTERN =
            Pattern.compile("\\\\(?:input|include)\\{([^}@#]+)#([^}]+)\\}");

    /**
     * Post-process all .tex files in workDir to resolve versioned \input references.
     * - \input{file@branch} → resolves branch content, writes file.tex, strips @branch
     * - \input{file#hash}   → resolves commit content, writes file.tex, strips #hash
     */
    private void resolveInputReferences(Long projectId, File workDir) throws IOException {
        File[] texFiles = findTexFilesRecursively(workDir);
        if (texFiles == null) return;

        for (File texFile : texFiles) {
            String content = Files.readString(texFile.toPath(), StandardCharsets.UTF_8);
            String processed = content;
            boolean changed = false;

            // Process @branch references
            Matcher branchMatcher = INPUT_BRANCH_PATTERN.matcher(processed);
            StringBuffer sb = new StringBuffer();
            while (branchMatcher.find()) {
                String filePath = branchMatcher.group(1).trim();
                String branchName = branchMatcher.group(2).trim();
                String cmdPrefix = branchMatcher.group(0).startsWith("\\include") ? "\\\\include" : "\\\\input";

                System.out.println("Resolving @branch reference: " + filePath + "@" + branchName);

                // Resolve content from the branch
                String resolvedContent = fileBranchService.resolveInputReference(
                        projectId, filePath.endsWith(".tex") ? filePath : filePath + ".tex",
                        branchName, true);

                if (resolvedContent != null) {
                    // Write the resolved content to the target file
                    String targetFileName = sanitizeFilename(
                            filePath.endsWith(".tex") ? filePath : filePath + ".tex");
                    File targetFile = new File(workDir, targetFileName);
                    Files.writeString(targetFile.toPath(), resolvedContent, StandardCharsets.UTF_8);
                    System.out.println("  -> Wrote branch content to: " + targetFileName);
                }

                // Strip @branch from the \input command
                branchMatcher.appendReplacement(sb,
                        Matcher.quoteReplacement("\\" + (branchMatcher.group(0).contains("\\include") ? "include" : "input")
                                + "{" + filePath + "}"));
                changed = true;
            }
            branchMatcher.appendTail(sb);
            processed = sb.toString();

            // Process #hash references
            Matcher commitMatcher = INPUT_COMMIT_PATTERN.matcher(processed);
            sb = new StringBuffer();
            while (commitMatcher.find()) {
                String filePath = commitMatcher.group(1).trim();
                String hash = commitMatcher.group(2).trim();

                System.out.println("Resolving #hash reference: " + filePath + "#" + hash);

                String resolvedContent = fileBranchService.resolveInputReference(
                        projectId, filePath.endsWith(".tex") ? filePath : filePath + ".tex",
                        hash, false);

                if (resolvedContent != null) {
                    String targetFileName = sanitizeFilename(
                            filePath.endsWith(".tex") ? filePath : filePath + ".tex");
                    File targetFile = new File(workDir, targetFileName);
                    Files.writeString(targetFile.toPath(), resolvedContent, StandardCharsets.UTF_8);
                    System.out.println("  -> Wrote commit content to: " + targetFileName);
                }

                commitMatcher.appendReplacement(sb,
                        Matcher.quoteReplacement("\\" + (commitMatcher.group(0).contains("\\include") ? "include" : "input")
                                + "{" + filePath + "}"));
                changed = true;
            }
            commitMatcher.appendTail(sb);
            processed = sb.toString();

            if (changed) {
                Files.writeString(texFile.toPath(), processed, StandardCharsets.UTF_8);
                System.out.println("Updated " + texFile.getName() + " with resolved references");
            }
        }
    }

    private File[] findTexFilesRecursively(File dir) {
        return dir.listFiles((d, name) -> {
            File f = new File(d, name);
            return f.isFile() && name.endsWith(".tex");
        });
    }

    private void listFilesRecursively(File dir, String indent) {
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    System.out.println(indent + "[DIR] " + f.getName() + "/");
                    listFilesRecursively(f, indent + "  ");
                } else {
                    System.out.println(indent + f.getName() + " (" + f.length() + " bytes)");
                }
            }
        }
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

    private File resolveDestinationFile(File workDir, String projectFolder, String filename) throws IOException {
        // Convert project folder path to relative path within workDir
        // Folder paths are now relative to /sources root, e.g., "/" -> "", "/sections" -> "sections"
        String relativePath = "";
        if (projectFolder != null && !projectFolder.isEmpty() && !projectFolder.equals("/")) {
            // Remove leading slash
            relativePath = projectFolder.replaceFirst("^/", "");
        }

        File destDir;
        if (relativePath.isEmpty()) {
            destDir = workDir;
        } else {
            // Sanitize folder path segments
            String[] segments = relativePath.split("/");
            StringBuilder sanitizedPath = new StringBuilder();
            for (String segment : segments) {
                if (!segment.isEmpty()) {
                    if (sanitizedPath.length() > 0) {
                        sanitizedPath.append(File.separator);
                    }
                    sanitizedPath.append(sanitizeFilename(segment));
                }
            }
            destDir = new File(workDir, sanitizedPath.toString());
        }

        // Create directories if they don't exist
        if (!destDir.exists() && !destDir.mkdirs()) {
            throw new IOException("Failed to create directory: " + destDir.getAbsolutePath());
        }

        return new File(destDir, filename);
    }
}
