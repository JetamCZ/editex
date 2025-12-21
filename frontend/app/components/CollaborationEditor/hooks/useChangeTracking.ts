import {useRef, useState, useCallback} from "react";
import type {editor} from "monaco-editor";

export type ChangeOperation = {
    operation: "MODIFY" | "INSERT_AFTER" | "DELETE";
    line: number;
    content?: string;
}

export const useChangeTracking = () => {
    const [changeHistory, setChangeHistory] = useState<ChangeOperation[]>([]);
    const previousLinesRef = useRef<string[]>([]);

    const detectChanges = useCallback((e: editor.IModelContentChangedEvent, model: editor.ITextModel) => {
        const newOperations: ChangeOperation[] = [];
        const previousLines = previousLinesRef.current;

        // Process each change event
        for (const change of e.changes) {
            const startLine = change.range.startLineNumber;
            const endLine = change.range.endLineNumber;
            const startCol = change.range.startColumn;
            const endCol = change.range.endColumn;
            const newText = change.text;
            const linesDeleted = endLine - startLine;
            const linesAdded = newText.split('\n').length - 1;

            // Case 1: Line deletion (entire lines removed)
            if (newText === '' && linesDeleted > 0 && startCol === 1) {
                // Full line(s) deleted
                for (let i = 0; i < linesDeleted; i++) {
                    newOperations.push({
                        operation: "DELETE",
                        line: startLine + i
                    });
                }
            }
            // Case 2: Line insertion (Enter key pressed, new lines added)
            else if (linesAdded > 0) {
                // When Enter is pressed, new lines are created
                const newLines = newText.split('\n');

                // If there's text before the cursor on the original line, that line is modified
                if (startCol > 1 || newLines[0] !== '') {
                    const currentLineContent = model.getLineContent(startLine);
                    const previousLineContent = previousLines[startLine - 1] || '';

                    // Only record if content actually changed
                    if (currentLineContent !== previousLineContent) {
                        newOperations.push({
                            operation: "MODIFY",
                            line: startLine,
                            content: currentLineContent
                        });
                    }
                }

                // All new lines are INSERT_AFTER operations
                for (let i = 1; i < newLines.length; i++) {
                    newOperations.push({
                        operation: "INSERT_AFTER",
                        line: startLine + i - 1,
                        content: model.getLineContent(startLine + i)
                    });
                }
            }
            // Case 3: Line modification (text changed within a line, no new lines)
            else if (linesAdded === 0 && linesDeleted === 0) {
                const currentLineContent = model.getLineContent(startLine);
                const previousLineContent = previousLines[startLine - 1] || '';

                // Only record if content actually changed
                if (currentLineContent !== previousLineContent) {
                    newOperations.push({
                        operation: "MODIFY",
                        line: startLine,
                        content: currentLineContent
                    });
                }
            }
            // Case 4: Complex change (e.g., paste multiple lines, replace selection spanning lines)
            else {
                // Handle deletion of lines if any
                if (linesDeleted > 0) {
                    for (let i = 0; i < linesDeleted; i++) {
                        newOperations.push({
                            operation: "DELETE",
                            line: startLine
                        });
                    }
                }

                // Handle insertion of lines if any
                if (linesAdded > 0) {
                    for (let i = 0; i < linesAdded; i++) {
                        const lineNum = startLine + i;
                        if (lineNum <= model.getLineCount()) {
                            newOperations.push({
                                operation: "INSERT_AFTER",
                                line: lineNum - 1,
                                content: model.getLineContent(lineNum)
                            });
                        }
                    }
                }

                // The affected line might also be modified
                if (startLine <= model.getLineCount()) {
                    const currentLineContent = model.getLineContent(startLine);
                    const previousLineContent = previousLines[startLine - 1] || '';

                    // Only record if content actually changed
                    if (currentLineContent !== previousLineContent) {
                        newOperations.push({
                            operation: "MODIFY",
                            line: startLine,
                            content: currentLineContent
                        });
                    }
                }
            }
        }

        if (newOperations.length > 0) {
            setChangeHistory(prev => {
                const updatedHistory = [...prev];

                for (const newOp of newOperations) {
                    const lastOp = updatedHistory[updatedHistory.length - 1];

                    // Squash consecutive MODIFY operations on the same line
                    if (lastOp &&
                        lastOp.operation === "MODIFY" &&
                        newOp.operation === "MODIFY" &&
                        lastOp.line === newOp.line) {
                        // Replace the last operation with the new one
                        updatedHistory[updatedHistory.length - 1] = newOp;
                    } else {
                        // Add as a new operation
                        updatedHistory.push(newOp);
                    }
                }

                return updatedHistory;
            });
        }

        // Update previous lines reference
        previousLinesRef.current = model.getLinesContent();
    }, []);

    const resetTracking = useCallback((lines: string[]) => {
        previousLinesRef.current = lines;
        setChangeHistory([]);
    }, []);

    return {
        changeHistory,
        detectChanges,
        resetTracking,
        previousLinesRef
    };
};
