import {useCallback, useEffect, useState, type Dispatch, type SetStateAction} from "react";
import type {editor} from "monaco-editor";
import type {ChangeOperation} from "./useChangeTracking";
import axios from "axios";

interface UseChangeSubmissionOptions {
    fileId: string;
    bearerToken: string;
    changeHistory: ChangeOperation[];
    setChangeHistory: Dispatch<SetStateAction<ChangeOperation[]>>;
    lastChangeId: string | null;
    setLastChangeId: (id: string) => void;
    editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
    sessionId: string;
    autoSave?: boolean;
    refetch: () => Promise<void>;
    branchId?: string | null;
    isDocumentLoadedRef: React.MutableRefObject<boolean>;
}

export function useChangeSubmission({
    fileId,
    bearerToken,
    changeHistory,
    setChangeHistory,
    lastChangeId,
    setLastChangeId,
    editorRef,
    sessionId,
    autoSave,
    refetch,
    branchId,
    isDocumentLoadedRef,
}: UseChangeSubmissionOptions) {
    const [isSending, setIsSending] = useState(false);

    const handleSendChanges = useCallback(async () => {
        // Refuse to send anything until the initial document load has
        // completed. Otherwise a pre-load change event (or a stale debounce
        // from a previous file) could push DELETEs against the wrong content.
        if (changeHistory.length === 0 || isSending || !isDocumentLoadedRef.current) {
            return;
        }

        // Capture the exact ops being sent by reference. While the POST is in
        // flight the user may keep typing, and squashOperations may mutate or
        // pop entries — so we can't rely on index positions. Referential
        // identity is stable: any op still present after the POST that isn't
        // in this set is an unsent edit we must keep.
        const sentOps = changeHistory;

        setIsSending(true);
        try {
            const payload = {
                sessionId,
                baseChangeId: lastChangeId,
                branchId: branchId || undefined,
                changes: sentOps.map(change => ({
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

            console.log(`Sent ${sentOps.length} changes to server via HTTP`);

            // Drop only the ops that were actually sent. Anything the user
            // typed during the POST stays in changeHistory for the next send.
            // Do NOT touch previousLinesRef — detectChanges keeps it in sync.
            const sentSet = new Set(sentOps);
            setChangeHistory(prev => prev.filter(op => !sentSet.has(op)));
        } catch (error) {
            console.error('Failed to send changes:', error);
        } finally {
            setIsSending(false);
        }
    }, [changeHistory, lastChangeId, bearerToken, fileId, setChangeHistory, isSending, setLastChangeId, sessionId, branchId]);

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
