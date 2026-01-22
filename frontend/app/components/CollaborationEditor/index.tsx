import type {ProjectFile} from "../../../types/file";
import {useChangeTracking, type ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";
import {useWebSocket} from "~/components/CollaborationEditor/hooks/useWebSocket";
import Editor from "@monaco-editor/react";
import getLanguage from "~/components/CollaborationEditor/lib/getLanguage";
import {registerLatexLanguage} from "~/components/CollaborationEditor/lib/latexLanguage";
import {useRef, useCallback, forwardRef, useImperativeHandle, useEffect} from "react";
import type {editor} from "monaco-editor";
import {Button, Tooltip, Separator, IconButton} from "@radix-ui/themes";
import {FontBoldIcon, FontItalicIcon, QuoteIcon, ListBulletIcon, TableIcon, ImageIcon} from "@radix-ui/react-icons";
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

    const handleSendChanges = useCallback(() => {
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
    }, [changeHistory, lastChangeId, sendChanges, resetTracking]);

    // Debounced auto-save: send changes 500ms after user stops typing
    useEffect(() => {
        if (changeHistory.length === 0) return;

        const timeoutId = setTimeout(() => {
            handleSendChanges();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [changeHistory, handleSendChanges]);

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

        // Register LaTeX language support
        registerLatexLanguage(monaco);

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
