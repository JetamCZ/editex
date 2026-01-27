export type CommitType = 'SPLIT' | 'MERGE' | 'COMMIT' | 'AUTOCOMMIT' | 'UNCOMMITTED';

export interface Commit {
    id: string;
    baseProject: string;
    branch: string;
    type: CommitType;
    sourceBranch: string | null;
    targetBranch: string | null;
    message: string | null;
    lastChangeId: string | null;
    author: string | null;
    authorId: number | null;
    createdAt: string;
}

export interface CreateCommitRequest {
    message: string;
    branch: string;
}

export interface BranchPendingChanges {
    branch: string;
    hasPendingChanges: boolean;
    lastCommitChangeId: string | null;
    currentChangeId: string | null;
    lastChangeAt: string | null;
    pendingChangeCount: number;
}

export interface FileDiff {
    fileId: string;
    fileName: string;
    filePath: string;
    oldContent: string;
    newContent: string;
    changeCount: number;
}
