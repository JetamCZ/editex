export interface DocumentChange {
    id: string;
    fileId: string;
    fileName: string;
    filePath: string;
    userId: string;
    userName: string;
    operation: 'MODIFY' | 'INSERT_AFTER' | 'DELETE';
    lineNumber: number;
    content: string | null;
    createdAt: string;
}

export interface GroupedChange {
    fileId: string;
    fileName: string;
    filePath: string;
    userId: string;
    userName: string;
    sessionId: string;
    changeCount: number;
    linesModified: number;
    linesInserted: number;
    linesDeleted: number;
    firstChangeAt: string;
    lastChangeAt: string;
}
