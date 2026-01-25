import {useCallback, useEffect, useState} from "react";
import axios from "axios";
import useAuth from "~/hooks/useAuth";
import type {ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";
import {applyChanges} from "~/components/CollaborationEditor/lib/applyChanges";
import {useToRef} from "~/hooks/useToRef";
import {transformHistory} from "~/components/CollaborationEditor/lib/transformHistory";


const useContent = (
    fileId: string,
    changeHistory: ChangeOperation[],
    setChangeHistory: (changes: ChangeOperation[]) => void,
    updatePreviousLines: (lines: string[]) => void,
    setEditorContent: (newContent: string, changes?: ChangeOperation[]) => void,
    setIsApplyingRemoteChanges: (value: boolean) => void,
    localSessionId: string
) => {
    const [content, setContent] = useState('');
    const [lastChangeId, setLastChangeId] = useState("");

    const {bearerToken} = useAuth();

    const contentRef = useToRef(content)
    const changeHistoryRef = useToRef(changeHistory)

    const refetch = useCallback(async () => {
        const {data} = await axios.get<{ content: string, lastChangeId: string }>(`/api/files/${fileId}/content`, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
            },
            baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'
        });

        // Clear state first to prevent tracking changes during reset
        const lines = data.content.split('\n');
        setChangeHistory([]);
        updatePreviousLines(lines);

        // Update content state
        setContent(data.content);
        setLastChangeId(data.lastChangeId);

        // Update editor last (after previousLines is set to prevent false change detection)
        setIsApplyingRemoteChanges(true);
        setEditorContent(data.content);
        setIsApplyingRemoteChanges(false);

    }, [fileId, bearerToken, updatePreviousLines, setChangeHistory, setEditorContent, setIsApplyingRemoteChanges]);

    useEffect(() => {
        refetch()
    }, [fileId, refetch]);

    const handleChanges = useCallback((changes: ChangeOperation[], senderSessionId: string | null) => {
        // Step 1: Apply remote changes to current content to get new server state
        const lines = contentRef.current.split('\n');
        const newServerContent = applyChanges(lines, changes);

        // Step 2: Transform local pending changes based on remote changes
        const transformedHistory = transformHistory(changeHistoryRef.current, changes);

        // Step 3: Apply transformed local changes on top of new server content
        const finalContent = applyChanges([...newServerContent], transformedHistory);

        // Step 4: Update state
        setContent(newServerContent.join('\n'));
        setLastChangeId(changes.at(-1)?.id!)
        updatePreviousLines(newServerContent);
        setChangeHistory(transformedHistory);

        // Step 5: Update editor without triggering change detection
        // Only pass changes for cursor transformation if they're from another user
        const isRemoteChange = senderSessionId !== null && senderSessionId !== localSessionId;
        setIsApplyingRemoteChanges(true);
        setEditorContent(finalContent.join('\n'), isRemoteChange ? changes : undefined);
        setIsApplyingRemoteChanges(false);

    }, [contentRef, changeHistoryRef, updatePreviousLines, setChangeHistory, setEditorContent, setIsApplyingRemoteChanges, localSessionId]);

    return {
        refetch,
        content,
        lastChangeId,
        handleChanges
    }
}

export default useContent;
