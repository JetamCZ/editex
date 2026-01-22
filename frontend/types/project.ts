import { Role } from './member';

export interface Project {
    id: number;
    baseProject: string;
    branch: string;
    name: string;
    ownerId: number;
    userRole: Role;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}
