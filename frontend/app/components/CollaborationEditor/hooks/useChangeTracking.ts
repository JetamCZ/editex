import {useRef, useState, useCallback} from "react";
import type {editor} from "monaco-editor";
import {computeMinimalChanges, squashOperations, type ChangeOperation} from "../lib/changeTracking";

export type { ChangeOperation };

const MAX_UNDO_STACK_SIZE = 100;

export const useChangeTracking = () => {
    const [changeHistory, setChangeHistory] = useState<ChangeOperation[]>([]);
    const previousLinesRef = useRef<string[]>([]);
    const isApplyingRemoteChanges = useRef(false);
    const isDocumentLoadedRef = useRef(false);
    const undoStackRef = useRef<string[][]>([]);
    const redoStackRef = useRef<string[][]>([]);
    const isUndoingRef = useRef(false);

    const detectChanges = useCallback((e: editor.IModelContentChangedEvent, model: editor.ITextModel) => {
        // Skip detection if we're applying remote changes, undoing, or
        // the document hasn't finished its initial load yet. Without the
        // load guard, any change event fired during the window between
        // editor mount and refetch() completion would diff against an
        // empty previousLinesRef and emit DELETEs that wipe the file.
        if (isApplyingRemoteChanges.current || isUndoingRef.current || !isDocumentLoadedRef.current) {
            return;
        }

        const previousLines = previousLinesRef.current;
        const currentLines = model.getLinesContent();

        // Push to undo stack before recording the change (only if content actually changed)
        if (previousLines.length > 0 &&
            (previousLines.length !== currentLines.length ||
             !previousLines.every((line, i) => line === currentLines[i]))) {
            undoStackRef.current.push([...previousLines]);
            // Limit undo stack size
            if (undoStackRef.current.length > MAX_UNDO_STACK_SIZE) {
                undoStackRef.current.shift();
            }
            // Clear redo stack on new change
            redoStackRef.current = [];
        }

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

        // Check if ALL changes are single-line modifications (no lines added/deleted)
        const allSingleLineModify = e.changes.every(c => {
            const ld = c.range.endLineNumber - c.range.startLineNumber;
            const la = c.text.split('\n').length - 1;
            return ld === 0 && la === 0;
        });

        if (allSingleLineModify) {
            // Each change is a simple line modification
            for (const c of e.changes) {
                const lineNum = c.range.startLineNumber;
                const currentContent = model.getLineContent(lineNum);
                const previousContent = previousLines[lineNum - 1] || '';

                if (currentContent !== previousContent) {
                    newOperations.push({
                        operation: "MODIFY",
                        line: lineNum,
                        content: currentContent
                    });
                }
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

    const setIsDocumentLoaded = useCallback((value: boolean) => {
        isDocumentLoadedRef.current = value;
    }, []);

    const undo = useCallback((editor: editor.IStandaloneCodeEditor | null): boolean => {
        if (!editor || undoStackRef.current.length === 0) {
            return false;
        }

        const model = editor.getModel();
        if (!model) {
            return false;
        }

        // Save current state to redo stack
        const currentLines = model.getLinesContent();
        redoStackRef.current.push([...currentLines]);

        // Pop from undo stack
        const previousState = undoStackRef.current.pop()!;
        const newContent = previousState.join('\n');

        // Set flag to prevent change detection
        isUndoingRef.current = true;

        // Save cursor position
        const position = editor.getPosition();
        const scrollTop = editor.getScrollTop();

        // Update editor content
        editor.setValue(newContent);

        // Update previous lines reference
        previousLinesRef.current = [...previousState];

        // Restore cursor position (clamped to valid range)
        if (position) {
            const lineCount = model.getLineCount();
            const lineNumber = Math.min(position.lineNumber, lineCount);
            const lineLength = model.getLineLength(lineNumber);
            const column = Math.min(position.column, lineLength + 1);
            editor.setPosition({ lineNumber, column });
            editor.setScrollTop(scrollTop);
        }

        isUndoingRef.current = false;
        return true;
    }, []);

    const redo = useCallback((editor: editor.IStandaloneCodeEditor | null): boolean => {
        if (!editor || redoStackRef.current.length === 0) {
            return false;
        }

        const model = editor.getModel();
        if (!model) {
            return false;
        }

        // Save current state to undo stack
        const currentLines = model.getLinesContent();
        undoStackRef.current.push([...currentLines]);

        // Pop from redo stack
        const nextState = redoStackRef.current.pop()!;
        const newContent = nextState.join('\n');

        // Set flag to prevent change detection
        isUndoingRef.current = true;

        // Save cursor position
        const position = editor.getPosition();
        const scrollTop = editor.getScrollTop();

        // Update editor content
        editor.setValue(newContent);

        // Update previous lines reference
        previousLinesRef.current = [...nextState];

        // Restore cursor position (clamped to valid range)
        if (position) {
            const lineCount = model.getLineCount();
            const lineNumber = Math.min(position.lineNumber, lineCount);
            const lineLength = model.getLineLength(lineNumber);
            const column = Math.min(position.column, lineLength + 1);
            editor.setPosition({ lineNumber, column });
            editor.setScrollTop(scrollTop);
        }

        isUndoingRef.current = false;
        return true;
    }, []);

    const canUndo = useCallback(() => undoStackRef.current.length > 0, []);
    const canRedo = useCallback(() => redoStackRef.current.length > 0, []);

    const clearUndoHistory = useCallback(() => {
        undoStackRef.current = [];
        redoStackRef.current = [];
    }, []);

    return {
        changeHistory,
        setChangeHistory,
        detectChanges,
        resetTracking,
        updatePreviousLines,
        previousLinesRef,
        isDocumentLoadedRef,
        setIsDocumentLoaded,
        setIsApplyingRemoteChanges,
        undo,
        redo,
        canUndo,
        canRedo,
        clearUndoHistory
    };
};
