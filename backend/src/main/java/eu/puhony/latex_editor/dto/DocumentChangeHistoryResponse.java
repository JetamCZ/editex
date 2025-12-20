package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChangeHistoryResponse {
    private Long id;
    private String fileId;
    private Long userId;
    private String userName;
    private Integer lineNumber;
    private String changeType;
    private String oldContent;
    private String newContent;
    private LocalDateTime createdAt;
}
