import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type {
  DocumentEditMessage,
  DocumentSyncResponse,
  UserPresenceMessage,
} from "~/types/collaboration";

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, any> = new Map();
  private backendUrl: string;

  constructor() {
    // Use environment variable or default to localhost
    const backend = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080/api";
    this.backendUrl = backend.replace("/api", ""); // Remove /api suffix for WebSocket
  }

  /**
   * Connect to WebSocket server with JWT authentication
   */
  connect(
    jwtToken: string,
    onConnected?: () => void,
    onError?: (error: any) => void
  ): void {
    if (this.client?.connected) {
      console.log("WebSocket already connected");
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${this.backendUrl}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${jwtToken}`,
      },
      debug: (str: string) => {
        console.log("[STOMP]", str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("✅ Connected to WebSocket");
        if (onConnected) onConnected();
      },
      onStompError: (frame) => {
        console.error("❌ STOMP error:", frame);
        if (onError) onError(frame);
      },
      onWebSocketError: (error) => {
        console.error("❌ WebSocket error:", error);
        if (onError) onError(error);
      },
    });

    this.client.activate();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.subscriptions.clear();
      this.client = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.client?.connected || false;
  }

  /**
   * Subscribe to document updates
   */
  subscribeToDocument(
    fileId: string,
    onMessage: (data: DocumentSyncResponse) => void
  ): void {
    if (!this.client || !this.client.connected) {
      console.error("WebSocket not connected");
      return;
    }

    const subscription = this.client.subscribe(
      `/topic/document/${fileId}`,
      (message) => {
        const data: DocumentSyncResponse = JSON.parse(message.body);
        onMessage(data);
      }
    );

    this.subscriptions.set(`doc-${fileId}`, subscription);
  }

  /**
   * Subscribe to user presence updates
   */
  subscribeToPresence(
    fileId: string,
    onPresence: (data: UserPresenceMessage) => void
  ): void {
    if (!this.client || !this.client.connected) {
      console.error("WebSocket not connected");
      return;
    }

    const subscription = this.client.subscribe(
      `/topic/document/${fileId}/presence`,
      (message) => {
        const data: UserPresenceMessage = JSON.parse(message.body);
        onPresence(data);
      }
    );

    this.subscriptions.set(`presence-${fileId}`, subscription);
  }

  /**
   * Send document edit
   */
  sendEdit(fileId: string, editMessage: DocumentEditMessage): void {
    if (!this.client || !this.client.connected) {
      console.error("WebSocket not connected");
      return;
    }

    this.client.publish({
      destination: `/app/document/${fileId}/edit`,
      body: JSON.stringify(editMessage),
    });
  }

  /**
   * Join document session
   */
  joinDocument(fileId: string, presence: UserPresenceMessage): void {
    if (!this.client || !this.client.connected) {
      console.error("WebSocket not connected");
      return;
    }

    this.client.publish({
      destination: `/app/document/${fileId}/join`,
      body: JSON.stringify(presence),
    });
  }

  /**
   * Leave document session
   */
  leaveDocument(fileId: string, presence: UserPresenceMessage): void {
    if (!this.client || !this.client.connected) {
      console.error("WebSocket not connected");
      return;
    }

    this.client.publish({
      destination: `/app/document/${fileId}/leave`,
      body: JSON.stringify(presence),
    });

    // Unsubscribe from topics
    const docSub = this.subscriptions.get(`doc-${fileId}`);
    const presenceSub = this.subscriptions.get(`presence-${fileId}`);

    if (docSub) docSub.unsubscribe();
    if (presenceSub) presenceSub.unsubscribe();

    this.subscriptions.delete(`doc-${fileId}`);
    this.subscriptions.delete(`presence-${fileId}`);
  }

  /**
   * Update cursor position
   */
  updateCursor(fileId: string, cursorPosition: number, currentLine: number): void {
    if (!this.client || !this.client.connected) {
      return;
    }

    this.client.publish({
      destination: `/app/document/${fileId}/cursor`,
      body: JSON.stringify({
        fileId,
        cursorPosition,
        currentLine,
      }),
    });
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
