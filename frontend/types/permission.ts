export enum FolderRole {
    VIEWER = 'VIEWER',
    EDITOR = 'EDITOR',
    MANAGER = 'MANAGER',
}

const ORDER: Record<FolderRole, number> = {
    [FolderRole.VIEWER]: 0,
    [FolderRole.EDITOR]: 1,
    [FolderRole.MANAGER]: 2,
};

export function roleIncludes(have: FolderRole | null | undefined, need: FolderRole): boolean {
    if (!have) return false;
    return ORDER[have] >= ORDER[need];
}

export interface ProjectFolder {
    id: number;
    projectId: number;
    parentId: number | null;
    name: string;
    path: string;
    effectiveRole: FolderRole | null;
    hasExplicitGrants: boolean;
    createdAt: string;
}

export interface FolderPermission {
    id: number | null;
    folderId: number;
    userId: number;
    userEmail: string;
    userName: string;
    role: FolderRole;
    inherited: boolean;
    sourceFolderId: number;
    sourceFolderPath: string;
    grantedById: number | null;
    createdAt: string | null;
}

export interface AccessSummary {
    folders: ProjectFolder[];
    users: Array<{
        id: number;
        email: string;
        name: string;
    }>;
}
