package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResolvedFile {

    public enum Resolution {
        USE_SOURCE,     // Use the source branch version
        USE_TARGET,     // Keep the target branch version
        USE_MERGED,     // Use custom merged content (provided in resolvedContent)
        DELETE          // Delete the file in target
    }

    private String fileId;
    private String filePath;
    private Resolution resolution;

    // Only required when resolution is USE_MERGED
    private String resolvedContent;
}
