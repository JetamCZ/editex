import {useCallback, useEffect, useRef, useState} from "react";
import useAuth from "~/hooks/useAuth";
import {websocketService} from "~/lib/websocket.service";
import usePresenceUsers from "./usePresenceUsers";
import axios from "axios";
import type {DocumentContent} from "../../../../types/collaboration";

const useTextFileContent = (fileId: string) => {
    const {bearerToken} = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const {activeUsers, handlePresenceUpdate} = usePresenceUsers();

    const [content, setContent] = useState<string>("");
    const [lastChangeId, setLastChangeId] = useState<string | null>(null);

    const loadContent = useCallback(async () => {
        try {
            const {data} = await axios.get<DocumentContent>(`/documents/${fileId}/content`, {
                headers: {
                    Authorization: `Bearer ${bearerToken}`,
                },
                baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:8080/api"
            })

            setContent(data.content);
            setLastChangeId(data.lastChangeId);

        } catch (e) {

        }
    }, [fileId, bearerToken, setContent])

    const handleDocumentUpdate = () => {
        // TODO: Implement document update logic
    };

    useEffect(() => {
        loadContent()
    }, [fileId]);

    useEffect(() => {
        websocketService.connect(
            bearerToken,
            () => {
                console.log("✅ WebSocket connected for file:", fileId);
                setIsConnected(true);

                // Subscribe to document updates
                websocketService.subscribeToDocument(
                    fileId,
                    handleDocumentUpdate
                );

                // Subscribe to user presence
                websocketService.subscribeToPresence(
                    fileId,
                    handlePresenceUpdate
                );

                // Join the document
                websocketService.joinDocument(fileId, {
                    fileId,
                    cursorPosition: 0,
                    currentLine: 0,
                });
            },
            (error) => {
                console.error("❌ WebSocket connection error:", error);
                setIsConnected(false);
            }
        );

        // Cleanup on unmount
        return () => {
            if (websocketService.isConnected()) {
                websocketService.leaveDocument(fileId);
            }
        };
    }, [fileId, bearerToken, handlePresenceUpdate]);


    return {
        isConnected,
        activeUsers,
        content,
        setContent,
        lastChangeId
    }

}

export default useTextFileContent;
