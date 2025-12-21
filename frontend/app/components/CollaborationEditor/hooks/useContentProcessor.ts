import {useEffect, useState, useMemo, useCallback, useRef} from "react";
import type {ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";
import {useToRef} from "~/hooks/useToRef";
import {applyChanges} from "~/components/CollaborationEditor/lib/applyChanges";
import {transformHistory} from "~/components/CollaborationEditor/lib/transformHistory";


const useContentProcessor = (
    contentValue: { content: string, lastChangeId: string },
    changeHistory: ChangeOperation[],
    setChangeHistory: (changes: ChangeOperation[]) => void,
    updatePreviousLines: (lines: string[]) => void
) => {
    const [content, setContent] = useState(contentValue?.content);
    const [lastChangeId, setLastChangeId] = useState(contentValue?.lastChangeId);

    const contentRef = useToRef(content)
    const changeHistoryRef = useToRef(changeHistory)

    useEffect(() => {
        console.log("RESET")
        setContent(contentValue?.content)
        setLastChangeId(contentValue?.lastChangeId)
        setChangeHistory([])
        updatePreviousLines([])
    }, [contentValue]);

    const handleChanges = useCallback((changes: ChangeOperation[]) => {
        console.log("Applying remote changes:", changes);

        let lines = contentRef.current.split('\n');

        // Step 1: Apply incoming remote changes to content
        applyChanges(lines, changes);

        // Step 2: Update previousRef to the content with remote changes applied (new baseline)
        updatePreviousLines(lines);
        setChangeHistory([])

        // Step 3: Transform local change history based on remote changes
        const transformedHistory = transformHistory(changeHistoryRef.current, changes);

        console.log("transformedHistory", changeHistoryRef.current, transformedHistory)

        // Step 4: Apply transformed local changes on top
        applyChanges(lines, transformedHistory);

        // Step 5: Update history with transformed version and set new content
        setChangeHistory(transformedHistory);
        setContent(lines.join('\n'))

    }, [setChangeHistory, updatePreviousLines]);

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
