export enum Role {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export interface ProjectMember {
  id: number;
  baseProject: string;
  userId: number;
  userEmail: string;
  userName: string;
  role: Role;
  invitedBy: number | null;
  invitedByEmail: string | null;
  invitedByName: string | null;
  createdAt: string;
}
