import {useEffect, useRef, useState, useCallback} from "react";
import {Client, type IMessage} from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type {ChangeOperation} from "./useChangeTracking";
import useAuth from "~/hooks/useAuth";

export interface RemoteCursor {
    sessionId: string;
    userId: number;
    userName: string;
    line: number;
    column: number;
    selectionStartLine?: number;
    selectionStartColumn?: number;
    selectionEndLine?: number;
    selectionEndColumn?: number;
}

interface CursorPosition {
    line: number;
    column: number;
    selectionStartLine?: number;
    selectionStartColumn?: number;
    selectionEndLine?: number;
    selectionEndColumn?: number;
}

interface ReloadMessage {
    branch: string;
    reason: string;
}

interface WebSocketConfig {
    fileId: string;
    sessionId: string;
    branchId?: number | null;
    onChangesReceived: (changes: ChangeOperation[], senderSessionId: string | null) => void;
    onCursorUpdate?: (cursor: RemoteCursor) => void;
    onCursorLeave?: (sessionId: string) => void;
    onReload?: (message: ReloadMessage) => void;
}

export const useWebSocket = ({fileId, sessionId, branchId, onChangesReceived, onCursorUpdate, onCursorLeave, onReload}: WebSocketConfig) => {
    const clientRef = useRef<Client | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const sessionIdRef = useRef<string>(sessionId)

    const {bearerToken} = useAuth()

    const connect = useCallback(() => {
        if (!bearerToken || clientRef.current?.connected) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'),
            connectHeaders: {
                'Authorization': `Bearer ${bearerToken}`
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log('WebSocket connected');
                setIsConnected(true);

                // Subscribe to document changes (filter by branch)
                client.subscribe(`/topic/document/${fileId}`, (message: IMessage) => {
                    const response = JSON.parse(message.body);
                    // Ignore changes for different branches
                    if (response.branchId && branchId && response.branchId !== branchId) {
                        return;
                    }
                    onChangesReceived(response.changes, response.sessionId || null);
                });

                // Subscribe to branch change events
                client.subscribe(`/topic/document/${fileId}/branch-change`, (message: IMessage) => {
                    const response = JSON.parse(message.body);
                    console.log('Branch changed:', response);
                    if (onReload) {
                        onReload({ branch: response.newActiveBranchId, reason: 'branch-changed' });
                    }
                });

                // Subscribe to cursor updates
                client.subscribe(`/topic/document/${fileId}/cursors`, (message: IMessage) => {
                    const response = JSON.parse(message.body);
                    // Ignore our own cursor updates
                    if (response.sessionId !== sessionIdRef.current && onCursorUpdate) {
                        onCursorUpdate({
                            sessionId: response.sessionId,
                            userId: response.userId,
                            userName: response.userName,
                            line: response.line,
                            column: response.column,
                            selectionStartLine: response.selectionStartLine,
                            selectionStartColumn: response.selectionStartColumn,
                            selectionEndLine: response.selectionEndLine,
                            selectionEndColumn: response.selectionEndColumn,
                        });
                    }
                });

                // Subscribe to cursor leave events
                client.subscribe(`/topic/document/${fileId}/cursors/leave`, (message: IMessage) => {
                    const response = JSON.parse(message.body);
                    if (response.sessionId !== sessionIdRef.current && onCursorLeave) {
                        onCursorLeave(response.sessionId);
                    }
                });

                // Subscribe to reload events (triggered when changes are discarded)
                client.subscribe(`/topic/document/${fileId}/reload`, (message: IMessage) => {
                    const response = JSON.parse(message.body);
                    console.log('Received reload message:', response);
                    if (onReload) {
                        onReload(response);
                    }
                });
            },
            onDisconnect: () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
            },
            onStompError: (frame) => {
                console.error('STOMP error:', frame);
                setIsConnected(false);
            }
        });

        client.activate();
        clientRef.current = client;
    }, [fileId, onChangesReceived, onCursorUpdate, onCursorLeave, onReload, bearerToken]);

    const sendCursorLeave = useCallback(() => {
        if (!clientRef.current?.connected) return;

        clientRef.current.publish({
            destination: `/app/document/${fileId}/cursor/leave`,
            body: JSON.stringify({ sessionId: sessionIdRef.current })
        });
    }, [fileId]);

    const disconnect = useCallback(() => {
        if (clientRef.current) {
            // Notify others that we're leaving
            sendCursorLeave();
            clientRef.current.deactivate();
            clientRef.current = null;
            setIsConnected(false);
        }
    }, [sendCursorLeave]);

    const sendCursorPosition = useCallback((position: CursorPosition) => {
        if (!clientRef.current?.connected) return;

        const message = {
            sessionId: sessionIdRef.current,
            line: position.line,
            column: position.column,
            selectionStartLine: position.selectionStartLine,
            selectionStartColumn: position.selectionStartColumn,
            selectionEndLine: position.selectionEndLine,
            selectionEndColumn: position.selectionEndColumn,
        };

        clientRef.current.publish({
            destination: `/app/document/${fileId}/cursor`,
            body: JSON.stringify(message)
        });
    }, [fileId]);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        isConnected,
        sessionId: sessionIdRef.current,
        sendCursorPosition,
        sendCursorLeave,
        connect,
        disconnect
    };
};
