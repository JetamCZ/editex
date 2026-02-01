package eu.puhony.latex_editor.service;

import eu.puhony.latex_editor.dto.DocumentChangeResponse;
import eu.puhony.latex_editor.dto.GroupedChangeResponse;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.Project;
import eu.puhony.latex_editor.entity.ProjectFile;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.DocumentChangeRepository;
import eu.puhony.latex_editor.repository.ProjectFileRepository;
import eu.puhony.latex_editor.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentChangeService {

    private final DocumentChangeRepository changeRepository;
    private final ProjectFileRepository fileRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberService projectMemberService;

    @Transactional
    public DocumentChange saveChange(String fileId, String sessionId, String operation,
                                     Integer lineNumber, String content, Long baseChangeId,
                                     User user) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanEdit(file.getProject().getBaseProject(), user.getId());

        // Get intermediate changes that happened after baseChangeId (if any)
        List<DocumentChange> intermediateChanges = Collections.emptyList();
        if (baseChangeId != null) {
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

        return changeRepository.save(change);
    }

    @Transactional
    public List<DocumentChange> saveChanges(String fileId, String sessionId,
                                           List<ChangeData> changes, Long baseChangeId,
                                           User user) {
        ProjectFile file = fileRepository.findByIdNonDeleted(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        projectMemberService.ensureCanEdit(file.getProject().getBaseProject(), user.getId());

        // Get intermediate changes that happened after baseChangeId (if any)
        // These are changes from OTHER sessions that we need to transform against
        List<DocumentChange> intermediateChanges = Collections.emptyList();
        if (baseChangeId != null) {
            intermediateChanges = changeRepository.findByFileIdAfterChange(fileId, baseChangeId);
        }

        // Transform and save each incoming change
        // Note: We only transform based on intermediate changes from other sessions.
        // Changes within the same request batch are already relative to each other
        // (the client calculated them as a coherent set).
        List<DocumentChange> savedChanges = new ArrayList<>();

        for (ChangeData changeData : changes) {
            // Transform line number based on intermediate changes from other sessions only
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

        return Math.max(1, line); // Ensure line is at least 1
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

    public List<DocumentChangeResponse> getRecentChanges(String baseProject, String branch, int limit, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);

        Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
                .orElseThrow(() -> new RuntimeException("Branch not found: " + branch));

        return changeRepository.findRecentByProjectId(project.getId(), PageRequest.of(0, limit))
                .stream()
                .map(DocumentChangeResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Get recent changes grouped by session + file + time window.
     * Changes within the same session, for the same file, within 5 minutes are grouped together.
     */
    public List<GroupedChangeResponse> getRecentChangesGrouped(String baseProject, String branch, int limit, Long userId) {
        projectMemberService.ensureCanRead(baseProject, userId);

        Project project = projectRepository.findByBaseProjectAndBranchNonDeleted(baseProject, branch)
                .orElseThrow(() -> new RuntimeException("Branch not found: " + branch));

        // Fetch more changes than needed to account for grouping
        List<DocumentChange> changes = changeRepository.findRecentByProjectId(
                project.getId(), PageRequest.of(0, limit * 10));

        // Group changes by session + file + time window (5 minutes)
        List<GroupedChangeResponse> grouped = groupChanges(changes, Duration.ofMinutes(5));

        // Return only the requested number of groups
        return grouped.stream().limit(limit).collect(Collectors.toList());
    }

    private List<GroupedChangeResponse> groupChanges(List<DocumentChange> changes, Duration timeWindow) {
        if (changes.isEmpty()) {
            return Collections.emptyList();
        }

        List<GroupedChangeResponse> result = new ArrayList<>();
        Map<String, GroupedChangeResponse> currentGroups = new LinkedHashMap<>();

        for (DocumentChange change : changes) {
            String fileId = change.getFile().getId();
            String sessionId = change.getSessionId();
            String groupKey = sessionId + ":" + fileId;

            GroupedChangeResponse existing = currentGroups.get(groupKey);

            if (existing != null) {
                // Check if within time window
                Duration timeDiff = Duration.between(change.getCreatedAt(), existing.getLastChangeAt()).abs();
                if (timeDiff.compareTo(timeWindow) <= 0) {
                    // Add to existing group
                    updateGroup(existing, change);
                    continue;
                } else {
                    // Time window exceeded, finalize existing and start new
                    result.add(existing);
                    currentGroups.remove(groupKey);
                }
            }

            // Create new group
            GroupedChangeResponse newGroup = createGroup(change);
            currentGroups.put(groupKey, newGroup);
        }

        // Add remaining groups
        result.addAll(currentGroups.values());

        // Sort by last change time descending
        result.sort((a, b) -> b.getLastChangeAt().compareTo(a.getLastChangeAt()));

        return result;
    }

    private GroupedChangeResponse createGroup(DocumentChange change) {
        GroupedChangeResponse group = new GroupedChangeResponse();
        group.setFileId(change.getFile().getId());
        group.setFileName(change.getFile().getOriginalFileName());
        group.setFilePath(change.getFile().getProjectFolder() + "/" + change.getFile().getOriginalFileName());
        group.setUserId(change.getUser().getId().toString());
        group.setUserName(change.getUser().getName());
        group.setSessionId(change.getSessionId());
        group.setChangeCount(1);
        group.setFirstChangeAt(change.getCreatedAt());
        group.setLastChangeAt(change.getCreatedAt());

        switch (change.getOperation()) {
            case "MODIFY" -> group.setLinesModified(1);
            case "INSERT_AFTER" -> group.setLinesInserted(1);
            case "DELETE" -> group.setLinesDeleted(1);
        }

        return group;
    }

    private void updateGroup(GroupedChangeResponse group, DocumentChange change) {
        group.setChangeCount(group.getChangeCount() + 1);

        // Update time bounds
        if (change.getCreatedAt().isBefore(group.getFirstChangeAt())) {
            group.setFirstChangeAt(change.getCreatedAt());
        }
        if (change.getCreatedAt().isAfter(group.getLastChangeAt())) {
            group.setLastChangeAt(change.getCreatedAt());
        }

        // Update operation counts
        switch (change.getOperation()) {
            case "MODIFY" -> group.setLinesModified(group.getLinesModified() + 1);
            case "INSERT_AFTER" -> group.setLinesInserted(group.getLinesInserted() + 1);
            case "DELETE" -> group.setLinesDeleted(group.getLinesDeleted() + 1);
        }
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
