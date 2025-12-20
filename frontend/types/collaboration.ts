// Type definitions for collaborative document editing

export enum DeltaType {
  INSERT = "INSERT",
  DELETE = "DELETE",
  MODIFY = "MODIFY",
}

export enum PresenceStatus {
  JOINED = "JOINED",
  EDITING = "EDITING",
  IDLE = "IDLE",
  LEFT = "LEFT",
}

export enum SyncStatus {
  SUCCESS = "SUCCESS",
  CONFLICT = "CONFLICT",
  ERROR = "ERROR",
}

export interface LineDelta {
  lineNumber: number;
  type: DeltaType;
  oldContent: string | null;
  newContent: string | null;
}

export interface DocumentEditMessage {
  fileId: string;
  sessionId: string;
  deltas: LineDelta[];
  cursorPosition?: number;
  currentLine?: number;
}

export interface DocumentSyncResponse {
  fileId: string;
  sessionId: string;
  userId: number;
  userName: string;
  deltas: LineDelta[];
  cursorPosition: number | null;
  currentLine: number | null;
  timestamp: string;
  status: SyncStatus;
}

export interface UserPresenceMessage {
  fileId: string;
  userId?: number;
  userName?: string;
  status?: PresenceStatus;
  cursorPosition?: number;
  currentLine?: number;
}

export interface ActiveSession {
  sessionId: string;
  fileId: string;
  userId: number;
  userName: string;
  cursorPosition: number | null;
  currentLine: number | null;
  connectedAt: string;
}

export interface DocumentChangeHistory {
  id: number;
  fileId: string;
  userId: number;
  userName: string;
  lineNumber: number;
  changeType: string;
  oldContent: string | null;
  newContent: string | null;
  createdAt: string;
}
