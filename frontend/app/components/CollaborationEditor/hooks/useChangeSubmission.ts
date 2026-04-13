import {useCallback, useEffect, useState} from "react";
import type {editor} from "monaco-editor";
import type {ChangeOperation} from "./useChangeTracking";
import axios from "axios";

interface UseChangeSubmissionOptions {
    fileId: string;
    bearerToken: string;
    changeHistory: ChangeOperation[];
    lastChangeId: string | null;
    setLastChangeId: (id: string) => void;
    resetTracking: (lines: string[]) => void;
    editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
    sessionId: string;
    autoSave?: boolean;
    refetch: () => Promise<void>;
    branchId?: string | null;
}

export function useChangeSubmission({
    fileId,
    bearerToken,
    changeHistory,
    lastChangeId,
    setLastChangeId,
    resetTracking,
    editorRef,
    sessionId,
    autoSave,
    refetch,
    branchId,
}: UseChangeSubmissionOptions) {
    const [isSending, setIsSending] = useState(false);

    const handleSendChanges = useCallback(async () => {
        if (changeHistory.length === 0 || isSending) {
            return;
        }

        setIsSending(true);
        try {
            const payload = {
                sessionId,
                baseChangeId: lastChangeId,
                branchId: branchId || undefined,
                changes: changeHistory.map(change => ({
                    operation: change.operation,
                    line: change.line,
                    content: change.content
                }))
            };

            const response = await axios.post<{ changes: Array<{ id: string }> }>(
                `/api/files/${fileId}/changes`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json',
                    },
                    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
                }
            );

            // Update lastChangeId from response to avoid race conditions
            const savedChanges = response.data.changes;
            if (savedChanges && savedChanges.length > 0) {
                const newLastChangeId = savedChanges[savedChanges.length - 1].id;
                setLastChangeId(newLastChangeId);
            }

            console.log(`Sent ${changeHistory.length} changes to server via HTTP`);

            // Clear the local changes history after successfully sending
            const model = editorRef.current?.getModel();
            if (model) {
                resetTracking(model.getLinesContent());
            }
        } catch (error) {
            console.error('Failed to send changes:', error);
        } finally {
            setIsSending(false);
        }
    }, [changeHistory, lastChangeId, bearerToken, fileId, resetTracking, isSending, setLastChangeId, sessionId, editorRef]);

    // Debounced auto-save: send changes after user stops typing
    const autoSaveDebounce = Number(import.meta.env.VITE_AUTOSAVE_DEBOUNCE_MS) || 1000;
    useEffect(() => {
        if (autoSave === false) return;
        if (changeHistory.length === 0) return;

        const timeoutId = setTimeout(() => {
            handleSendChanges();
        }, autoSaveDebounce);

        return () => clearTimeout(timeoutId);
    }, [changeHistory, handleSendChanges, autoSave]);

    const handleReloadFile = useCallback(async () => {
        console.log('Reloading file from server...');
        await refetch();
    }, [refetch]);

    return {handleSendChanges, handleReloadFile, isSending};
}
