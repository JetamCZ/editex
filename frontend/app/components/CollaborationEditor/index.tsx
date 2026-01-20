import type {ProjectFile} from "../../../types/file";
import {useChangeTracking, type ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";
import {useWebSocket} from "~/components/CollaborationEditor/hooks/useWebSocket";
import Editor from "@monaco-editor/react";
import getLanguage from "~/components/CollaborationEditor/lib/getLanguage";
import {useRef, useCallback, forwardRef, useImperativeHandle} from "react";
import type {editor} from "monaco-editor";
import {Button, Tooltip, Separator} from "@radix-ui/themes";
import useContent from "~/components/CollaborationEditor/hooks/useContent";
import type * as Monaco from "monaco-editor";

interface Props {
    selectedFile: ProjectFile;
}

export interface CollaborativeEditorRef {
    changeHistory: any[];
    isConnected: boolean;
    sessionId: string;
    handleReloadFile: () => Promise<void>;
    handleShowChanges: () => void;
    handleSendChanges: () => void;
}

// LaTeX formatting commands
const LATEX_FORMATS = {
    bold: { command: '\\textbf', label: 'B', tooltip: 'Bold (Ctrl+B)' },
    italic: { command: '\\textit', label: 'I', tooltip: 'Italic (Ctrl+I)' },
    underline: { command: '\\underline', label: 'U', tooltip: 'Underline (Ctrl+U)' },
    monospace: { command: '\\texttt', label: 'TT', tooltip: 'Monospace' },
    emphasis: { command: '\\emph', label: 'Em', tooltip: 'Emphasis' },
} as const;

// LaTeX list environments
const LATEX_LISTS = {
    itemize: { env: 'itemize', label: '•', tooltip: 'Bullet List (Ctrl+Shift+U)' },
    enumerate: { env: 'enumerate', label: '1.', tooltip: 'Numbered List (Ctrl+Shift+O)' },
} as const;

const CollaborativeEditor = forwardRef<CollaborativeEditorRef, Props>((props, ref) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof Monaco | null>(null);

    const {changeHistory, setChangeHistory, detectChanges, resetTracking, previousLinesRef, updatePreviousLines, setIsApplyingRemoteChanges} = useChangeTracking();

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

    const setEditorContent = useCallback((newContent: string) => {
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

                // Restore cursor position if it was saved
                if (position) {
                    editorRef.current.setPosition(position);
                    editorRef.current.setScrollTop(scrollTop);
                }
            }
        }
    }, [props.selectedFile.originalFileName])


    const {content, refetch, lastChangeId, handleChanges: onChangesReceived} = useContent(
        props.selectedFile.id,
        changeHistory,
        setChangeHistory,
        updatePreviousLines,
        setEditorContent,
        setIsApplyingRemoteChanges
    )

    const {isConnected, sessionId, sendChanges} = useWebSocket({
        fileId: props.selectedFile.id,
        onChangesReceived
    });

    const handleShowChanges = () => {
        console.log('Change History:', changeHistory);
    };

    const handleSendChanges = () => {
        if (changeHistory.length > 0) {
            sendChanges(changeHistory, lastChangeId!);
            console.log(`Sent ${changeHistory.length} changes to server`);

            // Clear the local changes history after successfully sending
            const model = editorRef.current?.getModel();
            if (model) {
                resetTracking(model.getLinesContent());
            }
        } else {
            console.log('No changes to send');
        }
    };

    const handleReloadFile = async () => {
        console.log('Reloading file from server...');
        await refetch();
    };

    // Expose methods and state to parent via ref
    useImperativeHandle(ref, () => ({
        changeHistory,
        isConnected,
        sessionId,
        handleReloadFile,
        handleShowChanges,
        handleSendChanges,
    }));

    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Initialize previous lines with the current content
        const model = editor.getModel();
        if (model) {
            previousLinesRef.current = model.getLinesContent();
        }

        // Listen to content changes with detailed change information
        editor.onDidChangeModelContent((e) => {
            const model = editor.getModel();
            if (model) {
                detectChanges(e, model);
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
    };

    const isTexFile = props.selectedFile.originalFileName.endsWith('.tex');

    return <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Formatting toolbar - only for .tex files */}
        {isTexFile && (
            <div style={{
                padding: '4px 8px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                backgroundColor: '#fafafa'
            }}>
                <Tooltip content={LATEX_FORMATS.bold.tooltip}>
                    <Button
                        onClick={() => wrapWithLatexCommand(LATEX_FORMATS.bold.command)}
                        size="1"
                        variant="ghost"
                        style={{ fontWeight: 'bold', minWidth: '32px' }}
                    >
                        B
                    </Button>
                </Tooltip>
                <Tooltip content={LATEX_FORMATS.italic.tooltip}>
                    <Button
                        onClick={() => wrapWithLatexCommand(LATEX_FORMATS.italic.command)}
                        size="1"
                        variant="ghost"
                        style={{ fontStyle: 'italic', minWidth: '32px' }}
                    >
                        I
                    </Button>
                </Tooltip>
                <Tooltip content={LATEX_FORMATS.underline.tooltip}>
                    <Button
                        onClick={() => wrapWithLatexCommand(LATEX_FORMATS.underline.command)}
                        size="1"
                        variant="ghost"
                        style={{ textDecoration: 'underline', minWidth: '32px' }}
                    >
                        U
                    </Button>
                </Tooltip>
                <Separator orientation="vertical" size="1" />
                <Tooltip content={LATEX_FORMATS.monospace.tooltip}>
                    <Button
                        onClick={() => wrapWithLatexCommand(LATEX_FORMATS.monospace.command)}
                        size="1"
                        variant="ghost"
                        style={{ fontFamily: 'monospace', minWidth: '32px' }}
                    >
                        TT
                    </Button>
                </Tooltip>
                <Tooltip content={LATEX_FORMATS.emphasis.tooltip}>
                    <Button
                        onClick={() => wrapWithLatexCommand(LATEX_FORMATS.emphasis.command)}
                        size="1"
                        variant="ghost"
                        style={{ fontStyle: 'italic', minWidth: '32px' }}
                    >
                        Em
                    </Button>
                </Tooltip>
                <Separator orientation="vertical" size="1" />
                <Tooltip content="Section">
                    <Button
                        onClick={() => wrapWithLatexCommand('\\section')}
                        size="1"
                        variant="ghost"
                    >
                        §
                    </Button>
                </Tooltip>
                <Tooltip content="Subsection">
                    <Button
                        onClick={() => wrapWithLatexCommand('\\subsection')}
                        size="1"
                        variant="ghost"
                    >
                        §§
                    </Button>
                </Tooltip>
                <Separator orientation="vertical" size="1" />
                <Tooltip content={LATEX_LISTS.itemize.tooltip}>
                    <Button
                        onClick={() => insertListEnvironment(LATEX_LISTS.itemize.env)}
                        size="1"
                        variant="ghost"
                        style={{ minWidth: '32px' }}
                    >
                        •
                    </Button>
                </Tooltip>
                <Tooltip content={LATEX_LISTS.enumerate.tooltip}>
                    <Button
                        onClick={() => insertListEnvironment(LATEX_LISTS.enumerate.env)}
                        size="1"
                        variant="ghost"
                        style={{ minWidth: '32px' }}
                    >
                        1.
                    </Button>
                </Tooltip>
            </div>
        )}

        <div style={{ flex: 1 }}>
            <Editor
                height="100%"
                defaultLanguage={getLanguage(props.selectedFile.originalFileName)}
                defaultValue={content || ''}
                theme="vs-light"
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
