import type {ProjectFile} from "../../../types/file";
import {useChangeTracking, type ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";
import {useWebSocket} from "~/components/CollaborationEditor/hooks/useWebSocket";
import Editor from "@monaco-editor/react";
import getLanguage from "~/components/CollaborationEditor/lib/getLanguage";
import {transformCursorPosition} from "~/components/CollaborationEditor/lib/transformCursor";
import {useRef, useCallback, forwardRef, useImperativeHandle} from "react";
import type {editor} from "monaco-editor";
import useContent from "~/components/CollaborationEditor/hooks/useContent";
import useAuth from "~/hooks/useAuth";
import type * as Monaco from "monaco-editor";
import { v4 as uuidv4 } from 'uuid';
import {wrapWithLatexCommand, insertListEnvironment, insertInlineMath, insertTable, insertImage, insertQuote, insertSection, insertInput} from "./lib/latexCommands";
import {useRemoteCursors} from "./hooks/useRemoteCursors";
import {useChangeSubmission} from "./hooks/useChangeSubmission";
import {useEditorSetup} from "./hooks/useEditorSetup";
import LatexToolbar from "./LatexToolbar";

interface Props {
    selectedFile: ProjectFile;
    autoSave?: boolean;
    readOnly?: boolean;
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
    triggerLayout: () => void;
}

const CollaborativeEditor = forwardRef<CollaborativeEditorRef, Props>((props, ref) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof Monaco | null>(null);
    const sessionIdRef = useRef<string>(uuidv4());
    const contentListenersRef = useRef<Set<(content: string) => void>>(new Set());

    const {bearerToken} = useAuth();
    const {changeHistory, setChangeHistory, detectChanges, resetTracking, previousLinesRef, updatePreviousLines, setIsApplyingRemoteChanges, undo, redo} = useChangeTracking();

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
        sessionIdRef.current,
        props.selectedFile.activeBranchId
    )

    const {handleCursorUpdate, handleCursorLeave} = useRemoteCursors({editorRef, monacoRef});

    // Handle reload event (triggered when changes are discarded)
    const handleReload = useCallback(() => {
        console.log('Reloading file due to discard changes event');
        refetch();
    }, [refetch]);

    const {isConnected, sendCursorPosition} = useWebSocket({
        fileId: props.selectedFile.id,
        sessionId: sessionIdRef.current,
        branchId: props.selectedFile.activeBranchId,
        onChangesReceived,
        onCursorUpdate: handleCursorUpdate,
        onCursorLeave: handleCursorLeave,
        onReload: handleReload,
    });

    const {handleSendChanges, handleReloadFile} = useChangeSubmission({
        fileId: props.selectedFile.id,
        bearerToken,
        changeHistory,
        lastChangeId,
        setLastChangeId,
        resetTracking,
        editorRef,
        sessionId: sessionIdRef.current,
        autoSave: props.autoSave,
        refetch,
        branchId: props.selectedFile.activeBranchId,
    });

    const handleShowChanges = () => {
        console.log('Change History:', changeHistory);
    };

    const {handleEditorDidMount} = useEditorSetup({
        editorRef,
        monacoRef,
        previousLinesRef,
        contentListenersRef,
        sendCursorPosition,
        detectChanges,
        undo,
        redo,
    });

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
            const ed = editorRef.current;
            const monaco = monacoRef.current;
            if (!ed || !monaco) return;
            const model = ed.getModel();
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

            // 2. Extra new lines -> insert after the last old line
            if (newLines.length > oldLines.length) {
                const insertText = '\n' + newLines.slice(oldLines.length).join('\n');
                const lastLine = oldLines.length;
                const lastCol = (oldLines[lastLine - 1]?.length ?? 0) + 1;
                edits.push({
                    range: new monaco.Range(lastLine, lastCol, lastLine, lastCol),
                    text: insertText,
                });
            }

            // 3. Excess old lines -> delete them
            if (oldLines.length > newLines.length) {
                const lastRemoveLine = oldLines.length;
                // Delete from end of last kept line to end of last removed line
                const lastKeptCol = (newLines[newLines.length - 1]?.length ?? 0) + 1;
                edits.push({
                    range: new monaco.Range(newLines.length, lastKeptCol, lastRemoveLine, oldLines[lastRemoveLine - 1].length + 1),
                    text: '',
                });
            }

            if (edits.length > 0) {
                ed.executeEdits('wysiwyg-sync', edits.map(e => ({
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
        triggerLayout: () => {
            editorRef.current?.layout();
        },
    }));

    const isTexFile = props.selectedFile.originalFileName.endsWith('.tex');

    return <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        {isTexFile && (
            <LatexToolbar
                selectedFile={props.selectedFile}
                hideActions={props.readOnly}
                onBold={() => editorRef.current && wrapWithLatexCommand(editorRef.current, '\\textbf')}
                onItalic={() => editorRef.current && wrapWithLatexCommand(editorRef.current, '\\textit')}
                onUnderline={() => editorRef.current && wrapWithLatexCommand(editorRef.current, '\\underline')}
                onMath={() => editorRef.current && insertInlineMath(editorRef.current)}
                onTable={() => editorRef.current && insertTable(editorRef.current)}
                onImage={() => editorRef.current && insertImage(editorRef.current)}
                onBulletList={() => editorRef.current && insertListEnvironment(editorRef.current, 'itemize')}
                onOrderedList={() => editorRef.current && insertListEnvironment(editorRef.current, 'enumerate')}
                onSection={(level) => editorRef.current && insertSection(editorRef.current, level)}
                onInput={() => editorRef.current && insertInput(editorRef.current)}
            />
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
                    readOnly: props.readOnly ?? false,
                }}
            />
        </div>
    </div>
});

CollaborativeEditor.displayName = 'CollaborativeEditor';

export default CollaborativeEditor
