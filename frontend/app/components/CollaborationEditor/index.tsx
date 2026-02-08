import type {ProjectFile} from "../../../types/file";
import {useChangeTracking, type ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";
import {useWebSocket, type RemoteCursor} from "~/components/CollaborationEditor/hooks/useWebSocket";
import Editor from "@monaco-editor/react";
import getLanguage from "~/components/CollaborationEditor/lib/getLanguage";
import {registerLatexLanguage} from "~/components/CollaborationEditor/lib/latexLanguage";
import {transformCursorPosition} from "~/components/CollaborationEditor/lib/transformCursor";
import {useRef, useCallback, forwardRef, useImperativeHandle, useEffect, useState} from "react";
import type {editor} from "monaco-editor";
import {Tooltip, IconButton} from "@radix-ui/themes";
import {FontBoldIcon, FontItalicIcon, QuoteIcon, ListBulletIcon, TableIcon, ImageIcon} from "@radix-ui/react-icons";
import useContent from "~/components/CollaborationEditor/hooks/useContent";
import useAuth from "~/hooks/useAuth";
import axios from "axios";
import type * as Monaco from "monaco-editor";
import { v4 as uuidv4 } from 'uuid';

interface Props {
    selectedFile: ProjectFile;
    autoSave?: boolean;
}

export interface CollaborativeEditorRef {
    changeHistory: any[];
    isConnected: boolean;
    sessionId: string;
    handleReloadFile: () => Promise<void>;
    handleShowChanges: () => void;
    handleSendChanges: () => void;
    getContent: () => string;
    replaceContent: (content: string) => void;
    onContentChange: (cb: (content: string) => void) => () => void;
}

// Generate consistent color from user ID
const getUserColor = (userId: number): string => {
    const colors = [
        '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
        '#00bcd4', '#009688', '#4caf50', '#ff9800', '#ff5722'
    ];
    return colors[userId % colors.length];
};

const CollaborativeEditor = forwardRef<CollaborativeEditorRef, Props>((props, ref) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof Monaco | null>(null);
    const decorationsRef = useRef<Map<string, string[]>>(new Map());
    const sessionIdRef = useRef<string>(uuidv4());
    const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
    const [isSending, setIsSending] = useState(false);

    const {bearerToken} = useAuth();
    const {changeHistory, setChangeHistory, detectChanges, resetTracking, previousLinesRef, updatePreviousLines, setIsApplyingRemoteChanges, undo, redo} = useChangeTracking();

    // Wrap selected text with LaTeX command
    const wrapWithLatexCommand = useCallback((command: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = editor.getSelection();
        if (!selection) return;

        const model = editor.getModel();
        if (!model) return;

        const selectedText = model.getValueInRange(selection);
        const wrappedText = `${command}{${selectedText}}`;

        editor.executeEdits('latex-format', [{
            range: selection,
            text: wrappedText,
            forceMoveMarkers: true
        }]);

        // If no text was selected, position cursor inside the braces
        if (selectedText.length === 0) {
            const newPosition = {
                lineNumber: selection.startLineNumber,
                column: selection.startColumn + command.length + 1
            };
            editor.setPosition(newPosition);
        }

        editor.focus();
    }, []);

    // Insert LaTeX list environment
    const insertListEnvironment = useCallback((envName: string) => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = editor.getSelection();
        if (!selection) return;

        const model = editor.getModel();
        if (!model) return;

        const selectedText = model.getValueInRange(selection);

        // Convert selected lines to list items, or create empty item
        let items: string;
        if (selectedText.trim()) {
            const lines = selectedText.split('\n').filter(line => line.trim());
            items = lines.map(line => `    \\item ${line.trim()}`).join('\n');
        } else {
            items = '    \\item ';
        }

        const listText = `\\begin{${envName}}\n${items}\n\\end{${envName}}`;

        editor.executeEdits('latex-list', [{
            range: selection,
            text: listText,
            forceMoveMarkers: true
        }]);

        // Position cursor after \item if no text was selected
        if (!selectedText.trim()) {
            const newPosition = {
                lineNumber: selection.startLineNumber + 1,
                column: 11 // After "    \item "
            };
            editor.setPosition(newPosition);
        }

        editor.focus();
    }, []);

    // Insert inline math
    const insertInlineMath = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = editor.getSelection();
        if (!selection) return;

        const model = editor.getModel();
        if (!model) return;

        const selectedText = model.getValueInRange(selection);
        const mathText = `$${selectedText}$`;

        editor.executeEdits('latex-math', [{
            range: selection,
            text: mathText,
            forceMoveMarkers: true
        }]);

        // If no text was selected, position cursor inside the $ $
        if (selectedText.length === 0) {
            const newPosition = {
                lineNumber: selection.startLineNumber,
                column: selection.startColumn + 1
            };
            editor.setPosition(newPosition);
        }

        editor.focus();
    }, []);

    // Insert table
    const insertTable = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const position = editor.getPosition();
        if (!position) return;

        const tableTemplate = `\\begin{table}[h]
    \\centering
    \\begin{tabular}{|c|c|}
        \\hline
        Header 1 & Header 2 \\\\
        \\hline
        Cell 1 & Cell 2 \\\\
        \\hline
    \\end{tabular}
    \\caption{Table caption}
    \\label{tab:my-table}
\\end{table}`;

        editor.executeEdits('latex-table', [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            },
            text: tableTemplate,
            forceMoveMarkers: true
        }]);

        editor.focus();
    }, []);

    // Insert image
    const insertImage = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const position = editor.getPosition();
        if (!position) return;

        const imageTemplate = `\\begin{figure}[h]
    \\centering
    \\includegraphics[width=0.5\\textwidth]{image.png}
    \\caption{Image caption}
    \\label{fig:my-image}
\\end{figure}`;

        editor.executeEdits('latex-image', [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            },
            text: imageTemplate,
            forceMoveMarkers: true
        }]);

        editor.focus();
    }, []);

    // Insert quote
    const insertQuote = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = editor.getSelection();
        if (!selection) return;

        const model = editor.getModel();
        if (!model) return;

        const selectedText = model.getValueInRange(selection);

        const quoteText = selectedText.trim()
            ? `\\begin{quote}\n    ${selectedText}\n\\end{quote}`
            : `\\begin{quote}\n    \n\\end{quote}`;

        editor.executeEdits('latex-quote', [{
            range: selection,
            text: quoteText,
            forceMoveMarkers: true
        }]);

        // If no text was selected, position cursor inside the quote
        if (!selectedText.trim()) {
            const newPosition = {
                lineNumber: selection.startLineNumber + 1,
                column: 5
            };
            editor.setPosition(newPosition);
        }

        editor.focus();
    }, []);

    const setEditorContent = useCallback((newContent: string, changes?: ChangeOperation[]) => {
        if (editorRef.current) {
            const model = editorRef.current.getModel();

            if (model) {
                // Save cursor position before updating content
                const position = editorRef.current.getPosition();
                const scrollTop = editorRef.current.getScrollTop();

                // Set the new content
                editorRef.current.setValue(newContent);

                // Update the language mode
                const language = getLanguage(props.selectedFile.originalFileName);
                const monaco = (window as any).monaco;
                if (monaco) {
                    monaco.editor.setModelLanguage(model, language);
                }

                // Restore cursor position, transformed if changes were provided
                if (position) {
                    let lineNumber = position.lineNumber;
                    let column = position.column;
                    if (changes && changes.length > 0) {
                        const transformed = transformCursorPosition(lineNumber, column, changes);
                        lineNumber = transformed.line;
                        column = transformed.column;
                    }
                    editorRef.current.setPosition({ lineNumber, column });
                    editorRef.current.setScrollTop(scrollTop);
                }
            }
        }
    }, [props.selectedFile.originalFileName])


    const {content, refetch, lastChangeId, setLastChangeId, handleChanges: onChangesReceived} = useContent(
        props.selectedFile.id,
        changeHistory,
        setChangeHistory,
        updatePreviousLines,
        setEditorContent,
        setIsApplyingRemoteChanges,
        sessionIdRef.current
    )

    // Handle remote cursor updates
    const handleCursorUpdate = useCallback((cursor: RemoteCursor) => {
        setRemoteCursors(prev => {
            const next = new Map(prev);
            next.set(cursor.sessionId, cursor);
            return next;
        });
    }, []);

    // Handle remote cursor leave
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
    }, []);

    // Handle reload event (triggered when changes are discarded)
    const handleReload = useCallback(() => {
        console.log('Reloading file due to discard changes event');
        refetch();
    }, [refetch]);

    const {isConnected, sendCursorPosition} = useWebSocket({
        fileId: props.selectedFile.id,
        sessionId: sessionIdRef.current,
        onChangesReceived,
        onCursorUpdate: handleCursorUpdate,
        onCursorLeave: handleCursorLeave,
        onReload: handleReload,
    });

    const handleShowChanges = () => {
        console.log('Change History:', changeHistory);
    };

    const handleSendChanges = useCallback(async () => {
        if (changeHistory.length === 0 || isSending) {
            return;
        }

        setIsSending(true);
        try {
            const payload = {
                sessionId: sessionIdRef.current,
                baseChangeId: lastChangeId,
                changes: changeHistory.map(change => ({
                    operation: change.operation,
                    line: change.line,
                    content: change.content
                }))
            };

            const response = await axios.post<{ changes: Array<{ id: string }> }>(
                `/api/files/${props.selectedFile.id}/changes`,
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
    }, [changeHistory, lastChangeId, bearerToken, props.selectedFile.id, resetTracking, isSending, setLastChangeId]);

    // Debounced auto-save: send changes 500ms after user stops typing
    useEffect(() => {
        if (props.autoSave === false) return;
        if (changeHistory.length === 0) return;

        const timeoutId = setTimeout(() => {
            handleSendChanges();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [changeHistory, handleSendChanges, props.autoSave]);

    const handleReloadFile = async () => {
        console.log('Reloading file from server...');
        await refetch();
    };

    // Content change listeners for WYSIWYG sync
    const contentListenersRef = useRef<Set<(content: string) => void>>(new Set());

    // Expose methods and state to parent via ref
    useImperativeHandle(ref, () => ({
        changeHistory,
        isConnected,
        sessionId: sessionIdRef.current,
        handleReloadFile,
        handleShowChanges,
        handleSendChanges,
        getContent: () => {
            return editorRef.current?.getModel()?.getValue() || '';
        },
        replaceContent: (content: string) => {
            const editor = editorRef.current;
            const monaco = monacoRef.current;
            if (!editor || !monaco) return;
            const model = editor.getModel();
            if (!model) return;

            const oldLines = model.getLinesContent();
            const newLines = content.split('\n');

            // Compute per-line edits so change tracking sees MODIFYs, not DELETE+INSERT
            const edits: {range: InstanceType<typeof monaco.Range>; text: string}[] = [];

            const minLen = Math.min(oldLines.length, newLines.length);

            // 1. Modify changed lines in the common range
            for (let i = 0; i < minLen; i++) {
                if (oldLines[i] !== newLines[i]) {
                    edits.push({
                        range: new monaco.Range(i + 1, 1, i + 1, oldLines[i].length + 1),
                        text: newLines[i],
                    });
                }
            }

            // 2. Extra new lines → insert after the last old line
            if (newLines.length > oldLines.length) {
                const insertText = '\n' + newLines.slice(oldLines.length).join('\n');
                const lastLine = oldLines.length;
                const lastCol = (oldLines[lastLine - 1]?.length ?? 0) + 1;
                edits.push({
                    range: new monaco.Range(lastLine, lastCol, lastLine, lastCol),
                    text: insertText,
                });
            }

            // 3. Excess old lines → delete them
            if (oldLines.length > newLines.length) {
                const firstRemoveLine = newLines.length + 1;
                const lastRemoveLine = oldLines.length;
                // Delete from end of last kept line to end of last removed line
                const lastKeptCol = (newLines[newLines.length - 1]?.length ?? 0) + 1;
                edits.push({
                    range: new monaco.Range(newLines.length, lastKeptCol, lastRemoveLine, oldLines[lastRemoveLine - 1].length + 1),
                    text: '',
                });
            }

            if (edits.length > 0) {
                editor.executeEdits('wysiwyg-sync', edits.map(e => ({
                    range: e.range,
                    text: e.text,
                    forceMoveMarkers: true,
                })));
            }
        },
        onContentChange: (cb: (content: string) => void) => {
            contentListenersRef.current.add(cb);
            return () => {
                contentListenersRef.current.delete(cb);
            };
        },
    }));

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
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;

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

            const newDecorations = editor.deltaDecorations(existingDecorations, decorations);
            decorationsRef.current.set(cursorSessionId, newDecorations);
        });
    }, [remoteCursors]);

    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Register LaTeX language support
        registerLatexLanguage(monaco);

        // Initialize previous lines with the current content
        const model = editor.getModel();
        if (model) {
            previousLinesRef.current = model.getLinesContent();
        }

        // Send cursor position on selection change
        editor.onDidChangeCursorSelection((e) => {
            const selection = e.selection;
            sendCursorPosition({
                line: selection.positionLineNumber,
                column: selection.positionColumn,
                selectionStartLine: selection.startLineNumber,
                selectionStartColumn: selection.startColumn,
                selectionEndLine: selection.endLineNumber,
                selectionEndColumn: selection.endColumn,
            });
        });

        // Listen to content changes with detailed change information
        editor.onDidChangeModelContent((e) => {
            const model = editor.getModel();
            if (model) {
                detectChanges(e, model);
                // Notify WYSIWYG content listeners
                const value = model.getValue();
                contentListenersRef.current.forEach(cb => cb(value));
            }
        });

        // Add keyboard shortcuts for LaTeX formatting
        editor.addAction({
            id: 'latex-bold',
            label: 'LaTeX Bold',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
            run: () => wrapWithLatexCommand('\\textbf')
        });

        editor.addAction({
            id: 'latex-italic',
            label: 'LaTeX Italic',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
            run: () => wrapWithLatexCommand('\\textit')
        });

        editor.addAction({
            id: 'latex-underline',
            label: 'LaTeX Underline',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU],
            run: () => wrapWithLatexCommand('\\underline')
        });

        editor.addAction({
            id: 'latex-itemize',
            label: 'LaTeX Bullet List',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyU],
            run: () => insertListEnvironment('itemize')
        });

        editor.addAction({
            id: 'latex-enumerate',
            label: 'LaTeX Numbered List',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO],
            run: () => insertListEnvironment('enumerate')
        });

        // Override default undo/redo with custom implementation for collaborative editing
        editor.addAction({
            id: 'custom-undo',
            label: 'Undo',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ],
            run: () => { undo(editor); }
        });

        editor.addAction({
            id: 'custom-redo',
            label: 'Redo',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY],
            run: () => { redo(editor); }
        });

        editor.addAction({
            id: 'custom-redo-shift',
            label: 'Redo',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ],
            run: () => { redo(editor); }
        });
    };

    const isTexFile = props.selectedFile.originalFileName.endsWith('.tex');

    return <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Formatting toolbar - only for .tex files */}
        {isTexFile && (
            <>
                <div style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid var(--gray-6)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    backgroundColor: '#fff'
                }}>
                    <Tooltip content="Bold (Ctrl+B)">
                        <IconButton
                            onClick={() => wrapWithLatexCommand('\\textbf')}
                            size="2"
                            variant="ghost"
                            color="gray"
                        >
                            <FontBoldIcon width="18" height="18" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip content="Italic (Ctrl+I)">
                        <IconButton
                            onClick={() => wrapWithLatexCommand('\\textit')}
                            size="2"
                            variant="ghost"
                            color="gray"
                        >
                            <FontItalicIcon width="18" height="18" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip content="Math equation">
                        <IconButton
                            onClick={insertInlineMath}
                            size="2"
                            variant="ghost"
                            color="gray"
                            style={{ fontSize: '18px', fontWeight: 'bold' }}
                        >
                            Σ
                        </IconButton>
                    </Tooltip>
                    <Tooltip content="Insert table">
                        <IconButton
                            onClick={insertTable}
                            size="2"
                            variant="ghost"
                            color="gray"
                        >
                            <TableIcon width="18" height="18" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip content="Insert image">
                        <IconButton
                            onClick={insertImage}
                            size="2"
                            variant="ghost"
                            color="gray"
                        >
                            <ImageIcon width="18" height="18" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip content="Quote">
                        <IconButton
                            onClick={insertQuote}
                            size="2"
                            variant="ghost"
                            color="gray"
                        >
                            <QuoteIcon width="18" height="18" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip content="Bullet list (Ctrl+Shift+U)">
                        <IconButton
                            onClick={() => insertListEnvironment('itemize')}
                            size="2"
                            variant="ghost"
                            color="gray"
                        >
                            <ListBulletIcon width="18" height="18" />
                        </IconButton>
                    </Tooltip>
                </div>
                {/* File path breadcrumb */}
                <div style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid var(--gray-6)',
                    backgroundColor: '#fff',
                    fontSize: '13px',
                    color: 'var(--gray-11)'
                }}>
                    <span style={{ color: 'var(--gray-10)' }}>workspace</span>
                    {props.selectedFile.projectFolder && props.selectedFile.projectFolder !== '/' && (
                        <>
                            {props.selectedFile.projectFolder.split('/').filter(Boolean).map((folder, index) => (
                                <span key={index}>
                                    <span style={{ margin: '0 6px', color: 'var(--gray-9)' }}>›</span>
                                    <span style={{ color: 'var(--gray-10)' }}>{folder}</span>
                                </span>
                            ))}
                        </>
                    )}
                    <span style={{ margin: '0 6px', color: 'var(--gray-9)' }}>›</span>
                    <span style={{ fontWeight: 500, color: 'var(--gray-12)' }}>{props.selectedFile.originalFileName}</span>
                </div>
            </>
        )}

        <div style={{ flex: 1 }}>
            <Editor
                height="100%"
                defaultLanguage={getLanguage(props.selectedFile.originalFileName)}
                defaultValue={content || ''}
                theme={isTexFile ? "latex-light" : "vs-light"}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                }}
            />
        </div>
    </div>
});

CollaborativeEditor.displayName = 'CollaborativeEditor';

export default CollaborativeEditor
