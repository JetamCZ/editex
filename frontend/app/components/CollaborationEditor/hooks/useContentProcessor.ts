import {useEffect, useState, useMemo, useCallback, useRef} from "react";
import type {ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";
import {useToRef} from "~/hooks/useToRef";
import {applyChanges} from "~/components/CollaborationEditor/lib/applyChanges";
import {transformHistory} from "~/components/CollaborationEditor/lib/transformHistory";


const useContentProcessor = (
    contentValue: { content: string, lastChangeId: string },
    changeHistory: ChangeOperation[],
    setChangeHistory: (changes: ChangeOperation[]) => void
) => {
    const [content, setContent] = useState(contentValue?.content);
    const [lastChangeId, setLastChangeId] = useState(contentValue?.lastChangeId);

    const contentRef = useToRef(content)
    const changeHistoryRef = useToRef(changeHistory)

    useEffect(() => {
        setContent(contentValue?.content)
        setLastChangeId(contentValue?.lastChangeId)
    }, [contentValue]);

    const handleChanges = useCallback((changes: ChangeOperation[]) => {
        console.log("Applying remote changes:", changes);

        let lines = contentRef.current.split('\n');

        // Step 1: Apply incoming remote changes to content
        applyChanges(lines, changes);

        // Step 2: Transform local change history based on remote changes
        const transformedHistory = transformHistory(changeHistoryRef.current, changes);

        console.log("transformedHistory", changeHistoryRef.current, transformedHistory)

        // Step 3: Apply transformed local changes on top
        applyChanges(lines, transformedHistory);

        // Step 4: Update history and return new content
        setChangeHistory(transformedHistory);
        setContent(lines.join('\n'))

    }, [setChangeHistory]);

    const contentObject = useMemo(() => ({
        content,
        lastChangeId
    }), [content, lastChangeId]);

    return {
        content: contentObject,
        handleChanges
    }
}

export default useContentProcessor
