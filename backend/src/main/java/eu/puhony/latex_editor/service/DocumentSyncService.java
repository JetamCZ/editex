package eu.puhony.latex_editor.service;

import com.github.difflib.DiffUtils;
import com.github.difflib.patch.AbstractDelta;
import com.github.difflib.patch.Patch;
import eu.puhony.latex_editor.dto.DocumentChangeHistoryResponse;
import eu.puhony.latex_editor.dto.DocumentEditMessage;
import eu.puhony.latex_editor.dto.DocumentSyncResponse;
import eu.puhony.latex_editor.entity.DocumentChange;
import eu.puhony.latex_editor.entity.User;
import eu.puhony.latex_editor.repository.DocumentChangeRepository;
import eu.puhony.latex_editor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentSyncService {

    private final DocumentChangeRepository changeRepository;
    private final UserRepository userRepository;

    /**
     * Process document changes and save to database
     */
    @Transactional
    public DocumentSyncResponse processDocumentChange(
        String fileId,
        String sessionId,
        Long userId,
        List<DocumentEditMessage.LineDelta> deltas
    ) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

            List<DocumentChange> changes = new ArrayList<>();

            for (DocumentEditMessage.LineDelta delta : deltas) {
                DocumentChange change = new DocumentChange();
                change.setFileId(fileId);
                change.setUser(user);
                change.setLineNumber(delta.getLineNumber());
                change.setChangeType(mapDeltaType(delta.getType()));
                change.setOldContent(delta.getOldContent());
                change.setNewContent(delta.getNewContent());
                change.setSessionId(sessionId);

                changes.add(changeRepository.save(change));
            }

            log.info("Processed {} changes for file {} by user {}", changes.size(), fileId, userId);

            return new DocumentSyncResponse(
                fileId,
                sessionId,
                userId,
                user.getName(),
                deltas,
                null,
                null,
                LocalDateTime.now(),
                DocumentSyncResponse.SyncStatus.SUCCESS
            );

        } catch (Exception e) {
            log.error("Error processing document change for file {}: {}", fileId, e.getMessage(), e);
            return new DocumentSyncResponse(
                fileId,
                sessionId,
                userId,
                null,
                deltas,
                null,
                null,
                LocalDateTime.now(),
                DocumentSyncResponse.SyncStatus.ERROR
            );
        }
    }

    /**
     * Create patch from old text to new text
     */
    public Patch<String> createPatch(String oldText, String newText) {
        List<String> oldLines = Arrays.asList(oldText.split("\n", -1));
        List<String> newLines = Arrays.asList(newText.split("\n", -1));
        return DiffUtils.diff(oldLines, newLines);
    }

    /**
     * Apply patches to text
     */
    public String applyPatches(String text, Patch<String> patch) {
        try {
            List<String> lines = Arrays.asList(text.split("\n", -1));
            List<String> patchedLines = DiffUtils.patch(lines, patch);
            return String.join("\n", patchedLines);
        } catch (Exception e) {
            log.error("Error applying patch: {}", e.getMessage(), e);
            return text; // Return original text if patch fails
        }
    }

    /**
     * Get diff deltas between old and new text
     */
    public List<AbstractDelta<String>> getDiffDeltas(String oldText, String newText) {
        Patch<String> patch = createPatch(oldText, newText);
        return patch.getDeltas();
    }

    /**
     * Convert full document text changes into line-level deltas
     */
    public List<DocumentEditMessage.LineDelta> computeLineDeltas(String oldText, String newText) {
        List<DocumentEditMessage.LineDelta> deltas = new ArrayList<>();

        String[] oldLines = oldText.split("\n", -1);
        String[] newLines = newText.split("\n", -1);

        int minLines = Math.min(oldLines.length, newLines.length);

        // Check for modifications
        for (int i = 0; i < minLines; i++) {
            if (!oldLines[i].equals(newLines[i])) {
                deltas.add(new DocumentEditMessage.LineDelta(
                    i,
                    DocumentEditMessage.DeltaType.MODIFY,
                    oldLines[i],
                    newLines[i]
                ));
            }
        }

        // Check for insertions
        if (newLines.length > oldLines.length) {
            for (int i = oldLines.length; i < newLines.length; i++) {
                deltas.add(new DocumentEditMessage.LineDelta(
                    i,
                    DocumentEditMessage.DeltaType.INSERT,
                    null,
                    newLines[i]
                ));
            }
        }

        // Check for deletions
        if (oldLines.length > newLines.length) {
            for (int i = newLines.length; i < oldLines.length; i++) {
                deltas.add(new DocumentEditMessage.LineDelta(
                    i,
                    DocumentEditMessage.DeltaType.DELETE,
                    oldLines[i],
                    null
                ));
            }
        }

        return deltas;
    }

    /**
     * Get change history for a file
     */
    public List<DocumentChangeHistoryResponse> getChangeHistory(String fileId) {
        List<DocumentChange> changes = changeRepository.findByFileIdOrderByCreatedAtAsc(fileId);
        return changes.stream()
            .map(this::toHistoryResponse)
            .collect(Collectors.toList());
    }

    /**
     * Get changes since a specific timestamp
     */
    public List<DocumentChangeHistoryResponse> getChangesSince(String fileId, LocalDateTime since) {
        List<DocumentChange> changes = changeRepository.findByFileIdAndCreatedAtAfterOrderByCreatedAtAsc(fileId, since);
        return changes.stream()
            .map(this::toHistoryResponse)
            .collect(Collectors.toList());
    }

    /**
     * Get changes by specific user
     */
    public List<DocumentChangeHistoryResponse> getChangesByUser(String fileId, Long userId) {
        List<DocumentChange> changes = changeRepository.findByFileIdAndUserIdOrderByCreatedAtAsc(fileId, userId);
        return changes.stream()
            .map(this::toHistoryResponse)
            .collect(Collectors.toList());
    }

    /**
     * Apply all document changes to the original content
     * Returns the current state of the document
     */
    public String applyAllChanges(String fileId, String originalContent) {
        List<DocumentChange> changes = changeRepository.findByFileIdOrderByCreatedAtAsc(fileId);

        if (changes.isEmpty()) {
            return originalContent;
        }

        String[] lines = originalContent.split("\n", -1);
        List<String> linesList = new ArrayList<>(Arrays.asList(lines));

        log.info("Applying {} changes to file {}", changes.size(), fileId);

        for (DocumentChange change : changes) {
            try {
                int lineNumber = change.getLineNumber();

                switch (change.getChangeType()) {
                    case INSERT:
                        if (change.getNewContent() != null) {
                            // Insert new line at the specified position
                            if (lineNumber <= linesList.size()) {
                                linesList.add(lineNumber, change.getNewContent());
                            }
                        }
                        break;

                    case DELETE:
                        // Delete line at the specified position
                        if (lineNumber < linesList.size()) {
                            linesList.remove(lineNumber);
                        }
                        break;

                    case MODIFY:
                        if (change.getNewContent() != null) {
                            // Replace line at the specified position
                            if (lineNumber < linesList.size()) {
                                linesList.set(lineNumber, change.getNewContent());
                            }
                        }
                        break;

                    case REPLACE:
                        if (change.getNewContent() != null) {
                            // Replace line at the specified position
                            if (lineNumber < linesList.size()) {
                                linesList.set(lineNumber, change.getNewContent());
                            }
                        }
                        break;
                }
            } catch (Exception e) {
                log.error("Error applying change {}: {}", change.getId(), e.getMessage());
                // Continue with other changes even if one fails
            }
        }

        return String.join("\n", linesList);
    }

    private DocumentChange.ChangeType mapDeltaType(DocumentEditMessage.DeltaType deltaType) {
        return switch (deltaType) {
            case INSERT -> DocumentChange.ChangeType.INSERT;
            case DELETE -> DocumentChange.ChangeType.DELETE;
            case MODIFY -> DocumentChange.ChangeType.MODIFY;
        };
    }

    private DocumentChangeHistoryResponse toHistoryResponse(DocumentChange change) {
        return new DocumentChangeHistoryResponse(
            change.getId(),
            change.getFileId(),
            change.getUser().getId(),
            change.getUser().getName(),
            change.getLineNumber(),
            change.getChangeType().toString(),
            change.getOldContent(),
            change.getNewContent(),
            change.getCreatedAt()
        );
    }
}
