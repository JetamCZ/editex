export interface ProjectFile {
    id: string;
    projectId: string;
    projectFolder: string;
    folderId?: number | null;
    fileName: string;
    originalFileName: string;
    fileSize: number;
    fileType: string;
    s3Url: string;
    uploadedBy: number;
    createdAt: string;
    lastChangeId?: string | null;
    activeBranchId?: number | null;
    activeBranchName?: string | null;
}

export interface FileBranch {
    id: number;
    fileId: string;
    name: string;
    sourceBranchName?: string | null;
    createdBy: number;
    createdAt: string;
    hasUncommittedChanges?: boolean;
}

export interface FileCommit {
    id: number;
    hash: string;
    branchId: number;
    message?: string | null;
    committedBy: number;
    committedByName: string;
    createdAt: string;
}
