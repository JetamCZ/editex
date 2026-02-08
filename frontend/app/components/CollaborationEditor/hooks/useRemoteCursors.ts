import {useCallback, useEffect, useRef, useState} from "react";
import type {RemoteCursor} from "./useWebSocket";
import type {editor} from "monaco-editor";
import type * as Monaco from "monaco-editor";

// Generate consistent color from user ID
const getUserColor = (userId: number): string => {
    const colors = [
        '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
        '#00bcd4', '#009688', '#4caf50', '#ff9800', '#ff5722'
    ];
    return colors[userId % colors.length];
};

interface UseRemoteCursorsOptions {
    editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
    monacoRef: React.RefObject<typeof Monaco | null>;
}

export function useRemoteCursors({editorRef, monacoRef}: UseRemoteCursorsOptions) {
    const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
    const decorationsRef = useRef<Map<string, string[]>>(new Map());

    const handleCursorUpdate = useCallback((cursor: RemoteCursor) => {
        setRemoteCursors(prev => {
            const next = new Map(prev);
            next.set(cursor.sessionId, cursor);
            return next;
        });
    }, []);

    const handleCursorLeave = useCallback((sessionId: string) => {
        setRemoteCursors(prev => {
            const next = new Map(prev);
            next.delete(sessionId);
            return next;
        });

        // Clean up decorations for this user
        if (editorRef.current) {
            const decorations = decorationsRef.current.get(sessionId) || [];
            editorRef.current.deltaDecorations(decorations, []);
            decorationsRef.current.delete(sessionId);
        }
    }, [editorRef]);

    // Inject CSS for collaborator cursors (only once)
    useEffect(() => {
        if (document.getElementById('collaborator-cursors-style')) return;

        const style = document.createElement('style');
        style.id = 'collaborator-cursors-style';
        style.textContent = `
            .collaborator-cursor {
                width: 2px !important;
                margin-left: -1px;
            }
            .collaborator-selection {
                opacity: 0.3;
            }
        `;
        document.head.appendChild(style);
    }, []);

    // Update remote cursor decorations when cursors change
    useEffect(() => {
        const editorInstance = editorRef.current;
        const monaco = monacoRef.current;
        if (!editorInstance || !monaco) return;

        remoteCursors.forEach((cursor, cursorSessionId) => {
            const color = getUserColor(cursor.userId);
            const existingDecorations = decorationsRef.current.get(cursorSessionId) || [];

            // Create unique class names for this user
            const cursorClass = `cursor-${cursor.userId}`;
            const selectionClass = `selection-${cursor.userId}`;

            // Add dynamic styles for this user if not exists
            const styleId = `cursor-style-${cursor.userId}`;
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `
                    .${cursorClass} {
                        background-color: ${color} !important;
                        width: 2px !important;
                    }
                    .${cursorClass}::after {
                        content: '${cursor.userName}';
                        background-color: ${color};
                        color: white;
                        padding: 2px 6px;
                        font-size: 11px;
                        font-weight: 500;
                        border-radius: 3px 3px 3px 0;
                        position: absolute;
                        top: -18px;
                        left: 0;
                        white-space: nowrap;
                        pointer-events: none;
                        z-index: 100;
                    }
                    .${selectionClass} {
                        background-color: ${color};
                        opacity: 0.3;
                    }
                `;
                document.head.appendChild(style);
            }

            const decorations: editor.IModelDeltaDecoration[] = [];

            // Add cursor decoration
            decorations.push({
                range: new monaco.Range(cursor.line, cursor.column, cursor.line, cursor.column),
                options: {
                    className: `collaborator-cursor ${cursorClass}`,
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                    zIndex: 100,
                }
            });

            // Add selection decoration if there's a selection
            if (cursor.selectionStartLine && cursor.selectionEndLine &&
                (cursor.selectionStartLine !== cursor.selectionEndLine ||
                 cursor.selectionStartColumn !== cursor.selectionEndColumn)) {
                decorations.push({
                    range: new monaco.Range(
                        cursor.selectionStartLine,
                        cursor.selectionStartColumn || 1,
                        cursor.selectionEndLine,
                        cursor.selectionEndColumn || 1
                    ),
                    options: {
                        className: `collaborator-selection ${selectionClass}`,
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                    }
                });
            }

            const newDecorations = editorInstance.deltaDecorations(existingDecorations, decorations);
            decorationsRef.current.set(cursorSessionId, newDecorations);
        });
    }, [remoteCursors, editorRef, monacoRef]);

    return {handleCursorUpdate, handleCursorLeave};
}
