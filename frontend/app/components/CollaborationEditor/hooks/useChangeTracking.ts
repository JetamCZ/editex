import {useRef, useState, useCallback} from "react";
import type {editor} from "monaco-editor";
import {computeMinimalChanges, squashOperations, type ChangeOperation} from "../lib/changeTracking";

export type { ChangeOperation };

export const useChangeTracking = () => {
    const [changeHistory, setChangeHistory] = useState<ChangeOperation[]>([]);
    const previousLinesRef = useRef<string[]>([]);
    const isApplyingRemoteChanges = useRef(false);

    const detectChanges = useCallback((e: editor.IModelContentChangedEvent, model: editor.ITextModel) => {
        // Skip detection if we're applying remote changes
        if (isApplyingRemoteChanges.current) {
            return;
        }

        const previousLines = previousLinesRef.current;
        const currentLines = model.getLinesContent();

        // Quick check: if nothing changed, skip
        if (previousLines.length === currentLines.length &&
            previousLines.every((line, i) => line === currentLines[i])) {
            return;
        }

        let newOperations: ChangeOperation[] = [];

        // Check if this is a simple single-line modification
        const change = e.changes[0];
        const linesDeleted = change.range.endLineNumber - change.range.startLineNumber;
        const linesAdded = change.text.split('\n').length - 1;

        if (e.changes.length === 1 && linesDeleted === 0 && linesAdded === 0) {
            // Simple modification within a single line
            const lineNum = change.range.startLineNumber;
            const currentContent = model.getLineContent(lineNum);
            const previousContent = previousLines[lineNum - 1] || '';

            if (currentContent !== previousContent) {
                newOperations.push({
                    operation: "MODIFY",
                    line: lineNum,
                    content: currentContent
                });
            }
        } else if (e.changes.length === 1 && linesAdded > 0 && linesDeleted === 0) {
            // Line insertion (e.g., pressing Enter)
            const startLine = change.range.startLineNumber;
            const startCol = change.range.startColumn;

            // Check if the original line was modified
            const currentFirstLine = model.getLineContent(startLine);
            const previousFirstLine = previousLines[startLine - 1] || '';

            if (currentFirstLine !== previousFirstLine) {
                newOperations.push({
                    operation: "MODIFY",
                    line: startLine,
                    content: currentFirstLine
                });
            }

            // Add INSERT_AFTER for new lines
            for (let i = 0; i < linesAdded; i++) {
                newOperations.push({
                    operation: "INSERT_AFTER",
                    line: startLine + i,
                    content: model.getLineContent(startLine + i + 1)
                });
            }
        } else {
            // Complex change - use diff algorithm
            newOperations = computeMinimalChanges(previousLines, currentLines);
        }

        if (newOperations.length > 0) {
            console.log('[Change Detection] Generated operations:', newOperations);
            setChangeHistory(prev => squashOperations(prev, newOperations));
        }

        // Update previous lines reference
        previousLinesRef.current = currentLines;
    }, []);

    const resetTracking = useCallback((lines: string[]) => {
        previousLinesRef.current = lines;
        setChangeHistory([]);
    }, []);

    const updatePreviousLines = useCallback((lines: string[]) => {
        previousLinesRef.current = lines;
    }, []);

    const setIsApplyingRemoteChanges = useCallback((value: boolean) => {
        isApplyingRemoteChanges.current = value;
    }, []);

    return {
        changeHistory,
        setChangeHistory,
        detectChanges,
        resetTracking,
        updatePreviousLines,
        previousLinesRef,
        setIsApplyingRemoteChanges
    };
};
