package eu.puhony.latex_editor.dto;

import java.time.LocalDateTime;

public class ProjectVersionPdfInfo {

    private String hash;
    private String message;
    private LocalDateTime createdAt;
    private boolean hasPdf;
    private String pdfUrl;

    public ProjectVersionPdfInfo(String hash, String message, LocalDateTime createdAt, boolean hasPdf, String pdfUrl) {
        this.hash = hash;
        this.message = message;
        this.createdAt = createdAt;
        this.hasPdf = hasPdf;
        this.pdfUrl = pdfUrl;
    }

    public String getHash() { return hash; }
    public String getMessage() { return message; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public boolean isHasPdf() { return hasPdf; }
    public String getPdfUrl() { return pdfUrl; }
}
