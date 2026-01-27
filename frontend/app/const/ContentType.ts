export const ContentType = {
    IMAGE: "image",
    TEXT: "text",
    UNKNOWN: "unknown",
    BINARY: "binary",
    PDF: "pdf",
} as const;

export type ContentTypeValue = typeof ContentType[keyof typeof ContentType];

export const typeMapping: Record<string, ContentTypeValue> = {
    // Images
    "image/png": ContentType.IMAGE,
    "image/jpeg": ContentType.IMAGE,
    "image/jpg": ContentType.IMAGE,
    "image/gif": ContentType.IMAGE,
    "image/webp": ContentType.IMAGE,
    "image/svg+xml": ContentType.IMAGE,
    "image/bmp": ContentType.IMAGE,
    "image/tiff": ContentType.IMAGE,
    // Text
    "text/plain": ContentType.TEXT,
    "text/x-tex": ContentType.TEXT,
    "application/x-tex": ContentType.TEXT,
    "application/x-latex": ContentType.TEXT,
    // PDF
    "application/pdf": ContentType.PDF,
    // Note: application/octet-stream is intentionally NOT mapped here
    // so that we fall back to file extension detection for unknown MIME types
};

// Helper to determine content type from file extension
export function getContentTypeFromFileName(fileName: string): ContentTypeValue {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
        case 'svg':
        case 'bmp':
        case 'tiff':
            return ContentType.IMAGE;
        case 'tex':
        case 'txt':
        case 'bib':
        case 'sty':
        case 'cls':
        case 'md':
        case 'json':
        case 'xml':
        case 'csv':
            return ContentType.TEXT;
        case 'pdf':
            return ContentType.PDF;
        default:
            return ContentType.UNKNOWN;
    }
}

// Get content type for a file, using both mime type and file extension
export function getFileContentType(mimeType: string, fileName: string): ContentTypeValue {
    // First check mime type mapping
    if (typeMapping[mimeType]) {
        return typeMapping[mimeType];
    }
    // Fall back to file extension
    return getContentTypeFromFileName(fileName);
}
