export type CommitType = 'SPLIT' | 'MERGE' | 'COMMIT';

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
