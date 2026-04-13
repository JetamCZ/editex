import type { FolderRole } from './permission';

export interface Project {
    id: number;
    baseProject: string;
    branch: string;
    name: string;
    ownerId: number;
    userRole: FolderRole | null;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}
