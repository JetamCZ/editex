import { Role } from './member';

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectName: string;
  invitedUserId: number;
  invitedUserEmail: string;
  invitedUserName: string;
  invitedBy: number;
  invitedByEmail: string;
  invitedByName: string;
  role: Role;
  status: InvitationStatus;
  createdAt: string;
  respondedAt: string | null;
}
