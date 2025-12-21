package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.DocumentChangeRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DocumentChangeService {

    private final DocumentChangeRepository changeRepository;
    private final ProjectFileRepository fileRepository;
    private final ProjectMemberService projectMemberService;

    @Transactional
    public DocumentChange saveChange(String fileId, String sessionId, String operation,
                                     Integer lineNumber, String content, String baseChangeId,
                                     User user) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanEdit(file.getProject().getId(), user.getId());

        DocumentChange change = new DocumentChange();
        change.setFile(file);
        change.setUser(user);
        change.setSessionId(sessionId);
        change.setOperation(operation);
        change.setLineNumber(lineNumber);
        change.setContent(content);
        change.setBaseChangeId(baseChangeId);

        return changeRepository.save(change);
    }

    @Transactional
    public List<DocumentChange> saveChanges(String fileId, String sessionId,
                                           List<ChangeData> changes, String baseChangeId,
                                           User user) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanEdit(file.getProject().getId(), user.getId());

        return changes.stream()
                .map(changeData -> {
                    DocumentChange change = new DocumentChange();
                    change.setFile(file);
                    change.setUser(user);
                    change.setSessionId(sessionId);
                    change.setOperation(changeData.getOperation());
                    change.setLineNumber(changeData.getLine());
                    change.setContent(changeData.getContent());
                    change.setBaseChangeId(baseChangeId);
                    return changeRepository.save(change);
                })
                .toList();
    }

    public List<DocumentChange> getFileChanges(String fileId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanRead(file.getProject().getId(), userId);

        return changeRepository.findByFileIdOrderByCreatedAt(fileId);
    }

    public Optional<DocumentChange> getLatestChange(String fileId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanRead(file.getProject().getId(), userId);

        return changeRepository.findLatestByFileId(fileId);
    }

    public List<DocumentChange> getChangesAfter(String fileId, String afterChangeId, Long userId) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanRead(file.getProject().getId(), userId);

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

        // Apply changes in chronological order
        for (DocumentChange change : changes) {
            int lineIndex = change.getLineNumber() - 1; // Convert to 0-based index

            switch (change.getOperation()) {
                case "MODIFY":
                    if (lineIndex >= 0 && lineIndex < lines.size()) {
                        lines.set(lineIndex, change.getContent() != null ? change.getContent() : "");
                    }
                    break;

                case "INSERT_AFTER":
                    // Insert after the specified line
                    int insertIndex = lineIndex + 1;
                    if (insertIndex >= 0 && insertIndex <= lines.size()) {
                        lines.add(insertIndex, change.getContent() != null ? change.getContent() : "");
                    }
                    break;

                case "DELETE":
                    if (lineIndex >= 0 && lineIndex < lines.size()) {
                        lines.remove(lineIndex);
                    }
                    break;

                default:
                    System.err.println("Unknown operation: " + change.getOperation());
            }
        }

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
