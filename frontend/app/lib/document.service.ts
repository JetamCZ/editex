import type {
  ActiveSession,
  DocumentChangeHistory,
} from "~/types/collaboration";

/**
 * Document collaboration API service
 * Handles REST API calls for document history and sessions
 */
class DocumentService {
  private getBackendUrl(): string {
    return import.meta.env.VITE_BACKEND_URL || "http://localhost:8080/api";
  }

  private async fetchWithAuth(url: string, token: string, options?: RequestInit) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get full change history for a document
   */
  async getHistory(fileId: string, token: string): Promise<DocumentChangeHistory[]> {
    const url = `${this.getBackendUrl()}/documents/${fileId}/history`;
    return this.fetchWithAuth(url, token);
  }

  /**
   * Get changes since a specific timestamp
   */
  async getChangesSince(
    fileId: string,
    timestamp: Date,
    token: string
  ): Promise<DocumentChangeHistory[]> {
    const url = `${this.getBackendUrl()}/documents/${fileId}/history/since?timestamp=${timestamp.toISOString()}`;
    return this.fetchWithAuth(url, token);
  }

  /**
   * Get changes by a specific user
   */
  async getChangesByUser(
    fileId: string,
    userId: number,
    token: string
  ): Promise<DocumentChangeHistory[]> {
    const url = `${this.getBackendUrl()}/documents/${fileId}/history/user/${userId}`;
    return this.fetchWithAuth(url, token);
  }

  /**
   * Get currently active editing sessions for a document
   */
  async getActiveSessions(fileId: string, token: string): Promise<ActiveSession[]> {
    const url = `${this.getBackendUrl()}/documents/${fileId}/sessions/active`;
    return this.fetchWithAuth(url, token);
  }

  /**
   * End current user's session for a document
   */
  async endSession(fileId: string, token: string): Promise<void> {
    const url = `${this.getBackendUrl()}/documents/${fileId}/sessions/end`;
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * End a specific session (admin/owner action)
   */
  async endSpecificSession(sessionId: string, token: string): Promise<void> {
    const url = `${this.getBackendUrl()}/documents/sessions/${sessionId}`;
    await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }
}

// Export singleton instance
export const documentService = new DocumentService();
