export type MergeStatus = 'ADDED' | 'MODIFIED' | 'DELETED' | 'CONFLICT' | 'UNCHANGED';

export type Resolution = 'USE_SOURCE' | 'USE_TARGET' | 'USE_MERGED' | 'DELETE';

export type PostMergeAction = 'DELETE_BRANCH' | 'RESET_BRANCH';

export interface LineConflict {
    startLine: number;
    endLine: number;
    sourceLines: string[];
    targetLines: string[];
    contextStartLine: number;
    contextEndLine: number;
}

export interface FileMergeStatus {
    fileId: string;
    filePath: string;
    fileName: string;
    status: MergeStatus;
    isTextFile: boolean;
    conflicts: LineConflict[] | null;
    isBinaryConflict: boolean;
    sourceFileId: string | null;
    sourceFileSize: number | null;
    targetFileId: string | null;
    targetFileSize: number | null;
}

export interface MergePreviewRequest {
    sourceBranch: string;
    targetBranch: string;
}

export interface MergePreviewResponse {
    sourceBranch: string;
    targetBranch: string;
    canMerge: boolean;
    validationError: string | null;
    files: FileMergeStatus[];
    addedCount: number;
    modifiedCount: number;
    deletedCount: number;
    conflictCount: number;
    unchangedCount: number;
}

export interface ResolvedFile {
    fileId: string;
    filePath: string;
    resolution: Resolution;
    resolvedContent?: string;
}

export interface MergeExecuteRequest {
    sourceBranch: string;
    targetBranch: string;
    resolvedFiles: ResolvedFile[];
    postMergeAction: PostMergeAction;
    commitMessage?: string;
}

export interface MergeExecuteResponse {
    success: boolean;
    message: string;
    mergedAt: string | null;
    filesAdded: number;
    filesModified: number;
    filesDeleted: number;
    postMergeActionResult: string;
    newBranchId: string | null;
}
