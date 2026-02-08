import {useCallback} from "react";
import type {editor} from "monaco-editor";
import type * as Monaco from "monaco-editor";
import {registerLatexLanguage} from "../lib/latexLanguage";
import {wrapWithLatexCommand, insertListEnvironment} from "../lib/latexCommands";

interface UseEditorSetupOptions {
    editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
    monacoRef: React.MutableRefObject<typeof Monaco | null>;
    previousLinesRef: React.MutableRefObject<string[]>;
    contentListenersRef: React.RefObject<Set<(content: string) => void>>;
    sendCursorPosition: (pos: {
        line: number;
        column: number;
        selectionStartLine?: number;
        selectionStartColumn?: number;
        selectionEndLine?: number;
        selectionEndColumn?: number;
    }) => void;
    detectChanges: (e: editor.IModelContentChangedEvent, model: editor.ITextModel) => void;
    undo: (editor: editor.IStandaloneCodeEditor) => void;
    redo: (editor: editor.IStandaloneCodeEditor) => void;
}

export function useEditorSetup({
    editorRef,
    monacoRef,
    previousLinesRef,
    contentListenersRef,
    sendCursorPosition,
    detectChanges,
    undo,
    redo,
}: UseEditorSetupOptions) {
    const handleEditorDidMount = useCallback((editorInstance: editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
        editorRef.current = editorInstance;
        monacoRef.current = monaco;

        // Register LaTeX language support
        registerLatexLanguage(monaco);

        // Initialize previous lines with the current content
        const model = editorInstance.getModel();
        if (model) {
            previousLinesRef.current = model.getLinesContent();
        }

        // Send cursor position on selection change
        editorInstance.onDidChangeCursorSelection((e) => {
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
        editorInstance.onDidChangeModelContent((e) => {
            const model = editorInstance.getModel();
            if (model) {
                detectChanges(e, model);
                // Notify WYSIWYG content listeners
                const value = model.getValue();
                contentListenersRef.current.forEach(cb => cb(value));
            }
        });

        // Add keyboard shortcuts for LaTeX formatting
        editorInstance.addAction({
            id: 'latex-bold',
            label: 'LaTeX Bold',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
            run: () => wrapWithLatexCommand(editorInstance, '\\textbf')
        });

        editorInstance.addAction({
            id: 'latex-italic',
            label: 'LaTeX Italic',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
            run: () => wrapWithLatexCommand(editorInstance, '\\textit')
        });

        editorInstance.addAction({
            id: 'latex-underline',
            label: 'LaTeX Underline',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU],
            run: () => wrapWithLatexCommand(editorInstance, '\\underline')
        });

        editorInstance.addAction({
            id: 'latex-itemize',
            label: 'LaTeX Bullet List',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyU],
            run: () => insertListEnvironment(editorInstance, 'itemize')
        });

        editorInstance.addAction({
            id: 'latex-enumerate',
            label: 'LaTeX Numbered List',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO],
            run: () => insertListEnvironment(editorInstance, 'enumerate')
        });

        // Override default undo/redo with custom implementation for collaborative editing
        editorInstance.addAction({
            id: 'custom-undo',
            label: 'Undo',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ],
            run: () => { undo(editorInstance); }
        });

        editorInstance.addAction({
            id: 'custom-redo',
            label: 'Redo',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY],
            run: () => { redo(editorInstance); }
        });

        editorInstance.addAction({
            id: 'custom-redo-shift',
            label: 'Redo',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ],
            run: () => { redo(editorInstance); }
        });
    }, [editorRef, monacoRef, previousLinesRef, contentListenersRef, sendCursorPosition, detectChanges, undo, redo]);

    return {handleEditorDidMount};
}
