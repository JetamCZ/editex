import type {editor} from "monaco-editor";

/**
 * Wrap selected text with a LaTeX command.
 * If no text is selected, positions the cursor inside the braces.
 */
export function wrapWithLatexCommand(editorInstance: editor.IStandaloneCodeEditor, command: string) {
    const selection = editorInstance.getSelection();
    if (!selection) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const selectedText = model.getValueInRange(selection);
    const wrappedText = `${command}{${selectedText}}`;

    editorInstance.executeEdits('latex-format', [{
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
        editorInstance.setPosition(newPosition);
    }

    editorInstance.focus();
}

/**
 * Insert a LaTeX list environment (itemize/enumerate).
 * Converts selected lines to list items, or creates an empty item.
 */
export function insertListEnvironment(editorInstance: editor.IStandaloneCodeEditor, envName: string) {
    const selection = editorInstance.getSelection();
    if (!selection) return;

    const model = editorInstance.getModel();
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

    editorInstance.executeEdits('latex-list', [{
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
        editorInstance.setPosition(newPosition);
    }

    editorInstance.focus();
}

/**
 * Insert inline math delimiters.
 * Wraps selected text in $...$, or positions cursor inside if nothing selected.
 */
export function insertInlineMath(editorInstance: editor.IStandaloneCodeEditor) {
    const selection = editorInstance.getSelection();
    if (!selection) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const selectedText = model.getValueInRange(selection);
    const mathText = `$${selectedText}$`;

    editorInstance.executeEdits('latex-math', [{
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
        editorInstance.setPosition(newPosition);
    }

    editorInstance.focus();
}

/**
 * Insert a table template at the current cursor position.
 */
export function insertTable(editorInstance: editor.IStandaloneCodeEditor) {
    const position = editorInstance.getPosition();
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

    editorInstance.executeEdits('latex-table', [{
        range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        },
        text: tableTemplate,
        forceMoveMarkers: true
    }]);

    editorInstance.focus();
}

/**
 * Insert an image/figure template at the current cursor position.
 */
export function insertImage(editorInstance: editor.IStandaloneCodeEditor) {
    const position = editorInstance.getPosition();
    if (!position) return;

    const imageTemplate = `\\begin{figure}[h]
    \\centering
    \\includegraphics[width=0.5\\textwidth]{image.png}
    \\caption{Image caption}
    \\label{fig:my-image}
\\end{figure}`;

    editorInstance.executeEdits('latex-image', [{
        range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        },
        text: imageTemplate,
        forceMoveMarkers: true
    }]);

    editorInstance.focus();
}

/**
 * Insert a quote environment.
 * Wraps selected text, or creates an empty quote with cursor inside.
 */
export function insertQuote(editorInstance: editor.IStandaloneCodeEditor) {
    const selection = editorInstance.getSelection();
    if (!selection) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const selectedText = model.getValueInRange(selection);

    const quoteText = selectedText.trim()
        ? `\\begin{quote}\n    ${selectedText}\n\\end{quote}`
        : `\\begin{quote}\n    \n\\end{quote}`;

    editorInstance.executeEdits('latex-quote', [{
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
        editorInstance.setPosition(newPosition);
    }

    editorInstance.focus();
}
