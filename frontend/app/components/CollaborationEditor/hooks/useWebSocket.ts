import {useEffect, useRef, useState, useCallback} from "react";
import {Client, type IMessage} from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type {ChangeOperation} from "./useChangeTracking";
import { v4 as uuidv4 } from 'uuid';
import useAuth from "~/hooks/useAuth";

interface WebSocketConfig {
    fileId: string;
    onChangesReceived: (changes: ChangeOperation[]) => void;
}

export const useWebSocket = ({fileId, onChangesReceived}: WebSocketConfig) => {
    const clientRef = useRef<Client | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const sessionIdRef = useRef<string>(uuidv4())

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

                // Subscribe to document changes
                client.subscribe(`/topic/document/${fileId}`, (message: IMessage) => {
                    const response = JSON.parse(message.body);
                    onChangesReceived(response.changes);
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
    }, [fileId, onChangesReceived, bearerToken]);

    const disconnect = useCallback(() => {
        if (clientRef.current) {
            clientRef.current.deactivate();
            clientRef.current = null;
            setIsConnected(false);
        }
    }, []);

    const sendChanges = useCallback((changes: ChangeOperation[], baseChangeId: string | null) => {
        if (!clientRef.current?.connected || changes.length === 0) return;

        const message = {
            sessionId: sessionIdRef.current,
            baseChangeId: baseChangeId,
            changes: changes.map(change => ({
                operation: change.operation,
                line: change.line,
                content: change.content
            }))
        };

        clientRef.current.publish({
            destination: `/app/document/${fileId}/changes`,
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
        sendChanges,
        connect,
        disconnect
    };
};
