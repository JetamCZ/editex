import type * as Monaco from "monaco-editor";

export function registerLatexLanguage(monaco: typeof Monaco) {
    // Check if already registered
    const languages = monaco.languages.getLanguages();
    if (languages.some(lang => lang.id === 'latex')) {
        return;
    }

    // Register the language
    monaco.languages.register({ id: 'latex' });

    // Define tokens for syntax highlighting
    monaco.languages.setMonarchTokensProvider('latex', {
        defaultToken: '',
        tokenPostfix: '.latex',

        // Common LaTeX commands
        commands: [
            'documentclass', 'usepackage', 'begin', 'end', 'section', 'subsection',
            'subsubsection', 'paragraph', 'chapter', 'part', 'title', 'author', 'date',
            'maketitle', 'tableofcontents', 'newcommand', 'renewcommand', 'newenvironment',
            'label', 'ref', 'cite', 'bibliography', 'bibliographystyle', 'input', 'include',
            'includegraphics', 'caption', 'footnote', 'textbf', 'textit', 'texttt', 'emph',
            'underline', 'item', 'hline', 'multicolumn', 'centering', 'raggedright',
            'raggedleft', 'newpage', 'clearpage', 'pagebreak', 'linebreak', 'noindent',
            'vspace', 'hspace', 'quad', 'qquad', 'newline', 'par', 'frac', 'sqrt', 'sum',
            'int', 'prod', 'lim', 'infty', 'partial', 'nabla', 'times', 'cdot', 'div',
            'pm', 'mp', 'leq', 'geq', 'neq', 'approx', 'equiv', 'subset', 'supset',
            'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'theta', 'lambda', 'mu', 'pi',
            'sigma', 'omega', 'phi', 'psi', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Sigma',
            'Omega', 'Phi', 'Psi', 'left', 'right', 'big', 'Big', 'bigg', 'Bigg',
        ],

        // Environments
        environments: [
            'document', 'figure', 'table', 'tabular', 'equation', 'align', 'gather',
            'multline', 'itemize', 'enumerate', 'description', 'verbatim', 'quote',
            'quotation', 'center', 'flushleft', 'flushright', 'minipage', 'abstract',
            'thebibliography', 'array', 'matrix', 'pmatrix', 'bmatrix', 'cases',
        ],

        brackets: [
            { open: '{', close: '}', token: 'delimiter.curly' },
            { open: '[', close: ']', token: 'delimiter.square' },
            { open: '(', close: ')', token: 'delimiter.parenthesis' },
        ],

        tokenizer: {
            root: [
                // Comments
                [/%.*$/, 'comment'],

                // Math mode - display
                [/\$\$/, { token: 'string.math', next: '@mathDouble' }],
                [/\\\[/, { token: 'string.math', next: '@mathBracket' }],

                // Math mode - inline
                [/\$/, { token: 'string.math', next: '@mathInline' }],
                [/\\\(/, { token: 'string.math', next: '@mathParen' }],

                // Begin/End environments
                [/(\\begin)(\{)([a-zA-Z*]+)(\})/, [
                    'keyword',
                    'delimiter.curly',
                    'tag',
                    'delimiter.curly'
                ]],
                [/(\\end)(\{)([a-zA-Z*]+)(\})/, [
                    'keyword',
                    'delimiter.curly',
                    'tag',
                    'delimiter.curly'
                ]],

                // Commands with arguments
                [/(\\[a-zA-Z@]+)(\*?)/, {
                    cases: {
                        '@commands': 'keyword',
                        '@default': 'keyword'
                    }
                }],

                // Special characters
                [/\\[{}$%&_#^~\\]/, 'string.escape'],

                // Curly braces for grouping
                [/[{}]/, 'delimiter.curly'],
                [/[\[\]]/, 'delimiter.square'],
                [/[()]/, 'delimiter.parenthesis'],

                // Numbers
                [/\d+(\.\d+)?/, 'number'],

                // Text
                [/[a-zA-Z]+/, 'text'],
            ],

            // Inline math mode $...$
            mathInline: [
                [/\$/, { token: 'string.math', next: '@pop' }],
                [/[^$\\]+/, 'string.math'],
                [/\\[a-zA-Z]+/, 'string.math.command'],
                [/\\./, 'string.math.escape'],
            ],

            // Display math mode $$...$$
            mathDouble: [
                [/\$\$/, { token: 'string.math', next: '@pop' }],
                [/[^$\\]+/, 'string.math'],
                [/\\[a-zA-Z]+/, 'string.math.command'],
                [/\\./, 'string.math.escape'],
            ],

            // Display math mode \[...\]
            mathBracket: [
                [/\\\]/, { token: 'string.math', next: '@pop' }],
                [/[^\]\\]+/, 'string.math'],
                [/\\[a-zA-Z]+/, 'string.math.command'],
                [/\\./, 'string.math.escape'],
            ],

            // Inline math mode \(...\)
            mathParen: [
                [/\\\)/, { token: 'string.math', next: '@pop' }],
                [/[^)\\]+/, 'string.math'],
                [/\\[a-zA-Z]+/, 'string.math.command'],
                [/\\./, 'string.math.escape'],
            ],
        },
    });

    // Language configuration for auto-closing, etc.
    monaco.languages.setLanguageConfiguration('latex', {
        comments: {
            lineComment: '%',
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
        ],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '$', close: '$' },
            { open: '`', close: "'" },
            { open: '"', close: '"' },
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '$', close: '$' },
            { open: '`', close: "'" },
            { open: '"', close: '"' },
        ],
        folding: {
            markers: {
                start: /\\begin\{/,
                end: /\\end\{/,
            },
        },
    });

    // Define a custom theme with LaTeX-specific colors
    monaco.editor.defineTheme('latex-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
            { token: 'keyword', foreground: '0000FF' },
            { token: 'tag', foreground: '800080' },
            { token: 'string.math', foreground: 'B91C1C', background: 'FEF2F2' },
            { token: 'string.math.command', foreground: '9333EA' },
            { token: 'string.escape', foreground: 'D97706' },
            { token: 'delimiter.curly', foreground: '0D9488' },
            { token: 'delimiter.square', foreground: '0D9488' },
            { token: 'number', foreground: '098658' },
        ],
        colors: {},
    });
}
