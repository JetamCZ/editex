package eu.puhony.latex_editor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompilationResult {
    private boolean success;
    private String pdfFileId;      // ProjectFile ID of generated PDF
    private String pdfUrl;         // S3 presigned URL
    private String compilationLog; // stdout + stderr from pdflatex
    private String errorMessage;   // User-friendly error if failed
    private long compilationTimeMs;
}
