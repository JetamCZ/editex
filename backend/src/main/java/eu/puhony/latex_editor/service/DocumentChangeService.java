package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.FileBranch;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.DocumentChangeRepository;
import eu.puhony.latex_editor.repository.FileBranchRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class DocumentChangeService {

    private final DocumentChangeRepository changeRepository;
    private final ProjectFileRepository fileRepository;
    private final ProjectMemberService projectMemberService;
    private final FileBranchRepository branchRepository;

    @Transactional
    public DocumentChange saveChange(String fileId, String sessionId, String operation,
                                     Integer lineNumber, String content, Long baseChangeId,
                                     User user) {
        return saveChange(fileId, sessionId, operation, lineNumber, content, baseChangeId, null, user);
    }

    @Transactional
    public DocumentChange saveChange(String fileId, String sessionId, String operation,
                                     Integer lineNumber, String content, Long baseChangeId,
                                     String branchId, User user) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanEdit(file.getProject().getBaseProject(), user.getId());

        // Resolve branch
        FileBranch branch = resolveBranch(file, branchId);

        // Get intermediate changes that happened after baseChangeId (if any)
        List<DocumentChange> intermediateChanges = Collections.emptyList();
        if (baseChangeId != null && branch != null) {
            intermediateChanges = changeRepository.findByFileIdAndBranchIdAfterChange(fileId, branch.getId(), baseChangeId);
        } else if (baseChangeId != null) {
            intermediateChanges = changeRepository.findByFileIdAfterChange(fileId, baseChangeId);
        }

        // Transform line number based on intermediate changes
        int transformedLine = transformLineNumber(lineNumber, intermediateChanges);

        DocumentChange change = new DocumentChange();
        change.setFile(file);
        change.setUser(user);
        change.setSessionId(sessionId);
        change.setOperation(operation);
        change.setLineNumber(transformedLine);
        change.setContent(content);
        change.setBaseChangeId(baseChangeId);
        change.setBranch(branch);

        return changeRepository.save(change);
    }

    @Transactional
    public List<DocumentChange> saveChanges(String fileId, String sessionId,
                                           List<ChangeData> changes, Long baseChangeId,
                                           User user) {
        return saveChanges(fileId, sessionId, changes, baseChangeId, null, user);
    }

    @Transactional
    public List<DocumentChange> saveChanges(String fileId, String sessionId,
                                           List<ChangeData> changes, Long baseChangeId,
                                           String branchId, User user) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanEdit(file.getProject().getBaseProject(), user.getId());

        // Resolve branch
        FileBranch branch = resolveBranch(file, branchId);

        // Get intermediate changes that happened after baseChangeId (if any)
        List<DocumentChange> intermediateChanges = Collections.emptyList();
        if (baseChangeId != null && branch != null) {
            intermediateChanges = changeRepository.findByFileIdAndBranchIdAfterChange(fileId, branch.getId(), baseChangeId);
        } else if (baseChangeId != null) {
            intermediateChanges = changeRepository.findByFileIdAfterChange(fileId, baseChangeId);
        }

        List<DocumentChange> savedChanges = new ArrayList<>();

        for (ChangeData changeData : changes) {
            int transformedLine = transformLineNumber(
                    changeData.getLine(),
                    intermediateChanges
            );

            DocumentChange change = new DocumentChange();
            change.setFile(file);
            change.setUser(user);
            change.setSessionId(sessionId);
            change.setOperation(changeData.getOperation());
            change.setLineNumber(transformedLine);
            change.setContent(changeData.getContent());
            change.setBaseChangeId(baseChangeId);
            change.setBranch(branch);

            DocumentChange saved = changeRepository.save(change);
            savedChanges.add(saved);
        }

        return savedChanges;
    }

    /**
     * Transform a line number based on intermediate changes that happened after baseChangeId.
     * - INSERT_AFTER at line X: lines > X shift down (+1)
     * - DELETE at line X: lines > X shift up (-1)
     * - MODIFY: no line number change
     */
    private int transformLineNumber(int originalLine, List<DocumentChange> intermediateChanges) {
        int line = originalLine;

        // Apply transformations from intermediate changes (from other sessions)
        for (DocumentChange intermediate : intermediateChanges) {
            line = applyTransformation(line, intermediate.getOperation(), intermediate.getLineNumber());
        }

        return Math.max(0, line); // Ensure line is non-negative (0 is valid for INSERT_AFTER)
    }

    private int applyTransformation(int line, String operation, int opLine) {
        switch (operation) {
            case "INSERT_AFTER":
                // Lines after the insertion point shift down
                if (line > opLine) {
                    return line + 1;
                }
                break;
            case "DELETE":
                // Lines after the deleted line shift up
                if (line > opLine) {
                    return line - 1;
                }
                // If targeting the deleted line itself, it's now pointing to the next line
                // (which shifted up to take its place)
                break;
            case "MODIFY":
                // No line number change for modifications
                break;
        }
        return line;
    }

    /**
     * Resolve branch: if branchId provided use it, otherwise fall back to file's active branch.
     */
    private FileBranch resolveBranch(ProjectFile file, String branchId) {
        if (branchId != null) {
            return branchRepository.findByIdNonDeleted(branchId)
                    .orElseThrow(() -> new RuntimeException("Branch not found: " + branchId));
        }
        return file.getActiveBranch(); // May be null for legacy files
    }

    public List<DocumentChange> getFileChanges(String fileId, String branchId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        projectMemberService.ensureCanRead(file.getProject().getBaseProject(), userId);
        return changeRepository.findByFileIdAndBranchIdOrderById(fileId, branchId);
    }

    public Optional<DocumentChange> getLatestChange(String fileId, String branchId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        projectMemberService.ensureCanRead(file.getProject().getBaseProject(), userId);
        return changeRepository.findLatestByFileIdAndBranchId(fileId, branchId);
    }

    public List<DocumentChange> getFileChanges(String fileId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanRead(file.getProject().getBaseProject(), userId);

        return changeRepository.findByFileIdOrderByCreatedAt(fileId);
    }

    public Optional<DocumentChange> getLatestChange(String fileId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanRead(file.getProject().getBaseProject(), userId);

        return changeRepository.findLatestByFileId(fileId);
    }

    public List<DocumentChange> getChangesAfter(String fileId, Long afterChangeId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanRead(file.getProject().getBaseProject(), userId);

        return changeRepository.findByFileIdAfterChange(fileId, afterChangeId);
    }

    public String applyChangesToContent(String originalContent, List<DocumentChange> changes) {
        if (changes == null || changes.isEmpty()) {
            return originalContent;
        }

        // Split content into lines
        List<String> lines = new java.util.ArrayList<>(
            java.util.Arrays.asList(originalContent.split("\n", -1))
        );

        System.out.println("DEBUG: Starting with " + lines.size() + " lines from original content");
        System.out.println("DEBUG: Applying " + changes.size() + " changes");

        // Apply changes in chronological order
        for (DocumentChange change : changes) {
            int lineIndex = change.getLineNumber() - 1; // Convert to 0-based index

            System.out.println("DEBUG: Change id=" + change.getId() + " op=" + change.getOperation() +
                             " line=" + change.getLineNumber() + " (index=" + lineIndex + ")" +
                             " content=" + (change.getContent() != null ? change.getContent().substring(0, Math.min(50, change.getContent().length())) : "null") +
                             " | lines.size()=" + lines.size());

            switch (change.getOperation()) {
                case "MODIFY":
                    if (lineIndex >= 0) {
                        // Expand lines list if needed to accommodate the line index
                        while (lines.size() <= lineIndex) {
                            lines.add("");
                        }
                        lines.set(lineIndex, change.getContent() != null ? change.getContent() : "");
                        System.out.println("DEBUG: MODIFY applied (lines.size now=" + lines.size() + ")");
                    } else {
                        System.out.println("DEBUG: MODIFY SKIPPED - lineIndex " + lineIndex + " is negative");
                    }
                    break;

                case "INSERT_AFTER":
                    // Insert after the specified line
                    int insertIndex = lineIndex + 1;
                    if (insertIndex >= 0) {
                        // Expand lines list if needed to accommodate the insert position
                        while (lines.size() < insertIndex) {
                            lines.add("");
                        }
                        lines.add(insertIndex, change.getContent() != null ? change.getContent() : "");
                        System.out.println("DEBUG: INSERT_AFTER applied at index " + insertIndex + " (lines.size now=" + lines.size() + ")");
                    } else {
                        System.out.println("DEBUG: INSERT_AFTER SKIPPED - insertIndex " + insertIndex + " is negative");
                    }
                    break;

                case "DELETE":
                    if (lineIndex >= 0 && lineIndex < lines.size()) {
                        lines.remove(lineIndex);
                        System.out.println("DEBUG: DELETE applied");
                    } else {
                        System.out.println("DEBUG: DELETE SKIPPED - lineIndex " + lineIndex + " out of bounds [0, " + lines.size() + ")");
                    }
                    break;

                default:
                    System.err.println("Unknown operation: " + change.getOperation());
            }
        }

        System.out.println("DEBUG: Final result has " + lines.size() + " lines");

        // Join lines back into content
        return String.join("\n", lines);
    }

    // DTO for change data
    public static class ChangeData {
        private String operation;
        private Integer line;
        private String content;

        public String getOperation() {
            return operation;
        }

        public void setOperation(String operation) {
            this.operation = operation;
        }

        public Integer getLine() {
            return line;
        }

        public void setLine(Integer line) {
            this.line = line;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}
