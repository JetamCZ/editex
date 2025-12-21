export interface ProjectFile {
    id: string;
    projectId: string;
    projectFolder: string;
    fileName: string;
    originalFileName: string;
    fileSize: number;
    fileType: string;
    s3Url: string;
    uploadedBy: number;
    createdAt: string;
    lastChangeId?: string | null;
}
