export interface Branch {
    id: number;
    baseProject: string;
    branch: string;
    sourceBranch: string | null;
    name: string;
    createdAt: string;
    updatedAt: string;
}
