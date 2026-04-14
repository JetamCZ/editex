import {type Token, TokenType, type TipTapNode, type TipTapMark, type TipTapDoc} from './types';
import {tokenize} from './tokenizer';

const SECTION_COMMANDS: Record<string, number> = {
    section: 1,
    subsection: 2,
    subsubsection: 3,
};

const FORMATTING_COMMANDS: Record<string, string> = {
    textbf: 'bold',
    textit: 'italic',
    emph: 'italic',
    underline: 'underline',
};

const SYMBOL_COMMANDS: Record<string, string> = {
    dots: '\u2026',
    ldots: '\u2026',
    textendash: '\u2013',
    textemdash: '\u2014',
};

const LIST_ENVIRONMENTS = new Set(['itemize', 'enumerate']);

export function parse(tokens: Token[]): TipTapDoc {
    const ctx = new ParserContext(tokens);
    const content = ctx.parseDocument();
    return {type: 'doc', content};
}

class ParserContext {
    private tokens: Token[];
    private pos: number;
    private rawStartPos: number;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.pos = 0;
        this.rawStartPos = 0;
    }

    private peek(): Token {
        return this.tokens[this.pos] || {type: TokenType.EOF, value: '', raw: '', pos: -1};
    }

    private advance(): Token {
        const tok = this.tokens[this.pos];
        this.pos++;
        return tok;
    }

    private consume(type: TokenType): Token {
        const tok = this.peek();
        if (tok.type !== type) {
            // Don't throw — be lenient. Return a dummy.
            return {type, value: '', raw: '', pos: tok.pos};
        }
        return this.advance();
    }

    /** Read tokens until we find a CLOSE_BRACE at the same nesting depth */
    private readBraceGroup(): Token[] {
        this.consume(TokenType.OPEN_BRACE);
        const result: Token[] = [];
        let depth = 1;
        while (depth > 0 && this.peek().type !== TokenType.EOF) {
            const tok = this.advance();
            if (tok.type === TokenType.OPEN_BRACE) depth++;
            else if (tok.type === TokenType.CLOSE_BRACE) {
                depth--;
                if (depth === 0) break;
            }
            result.push(tok);
        }
        return result;
    }

    /** Read the text content of a brace group (flattened) */
    private readBraceGroupText(): string {
        const tokens = this.readBraceGroup();
        return tokens.map(t => t.raw).join('');
    }

    /** Read raw tokens of a brace group for further parsing */
    private readBraceGroupTokens(): Token[] {
        return this.readBraceGroup();
    }

    /** Skip optional argument [...]  */
    private skipOptionalArg(): string | null {
        if (this.peek().type === TokenType.OPEN_BRACKET) {
            this.advance();
            let content = '';
            while (this.peek().type !== TokenType.CLOSE_BRACKET && this.peek().type !== TokenType.EOF) {
                content += this.advance().raw;
            }
            this.consume(TokenType.CLOSE_BRACKET);
            return content;
        }
        return null;
    }

    /** Collect raw source from all tokens between two indices */
    private rawBetween(startTokIdx: number, endTokIdx: number): string {
        let raw = '';
        for (let i = startTokIdx; i < endTokIdx && i < this.tokens.length; i++) {
            raw += this.tokens[i].raw;
        }
        return raw;
    }

    /** Read everything until \end{envName}, returning raw LaTeX */
    private readUntilEnd(envName: string): string {
        let raw = '';
        let depth = 1;
        while (this.peek().type !== TokenType.EOF) {
            // Check for \begin{same} (nested)
            if (this.peek().type === TokenType.COMMAND && this.peek().value === 'begin') {
                const savedPos = this.pos;
                this.advance(); // skip \begin
                if (this.peek().type === TokenType.OPEN_BRACE) {
                    const name = this.readBraceGroupText();
                    if (name === envName) depth++;
                    raw += `\\begin{${name}}`;
                    continue;
                }
                this.pos = savedPos;
            }
            // Check for \end{...}
            if (this.peek().type === TokenType.COMMAND && this.peek().value === 'end') {
                const savedPos = this.pos;
                this.advance(); // skip \end
                if (this.peek().type === TokenType.OPEN_BRACE) {
                    const name = this.readBraceGroupText();
                    if (name === envName) {
                        depth--;
                        if (depth === 0) {
                            return raw;
                        }
                    }
                    raw += `\\end{${name}}`;
                    continue;
                }
                this.pos = savedPos;
            }
            raw += this.advance().raw;
        }
        return raw;
    }

    parseDocument(): TipTapNode[] {
        const nodes: TipTapNode[] = [];
        let currentParagraphInlines: TipTapNode[] = [];

        const flushParagraph = () => {
            if (currentParagraphInlines.length > 0) {
                // Trim trailing/leading whitespace-only text nodes
                nodes.push({type: 'paragraph', content: currentParagraphInlines});
                currentParagraphInlines = [];
            }
        };

        while (this.peek().type !== TokenType.EOF) {
            const tok = this.peek();

            // Blank line = paragraph break
            if (tok.type === TokenType.NEWLINE) {
                this.advance();
                // Check for double newline (blank line)
                if (this.peek().type === TokenType.NEWLINE) {
                    while (this.peek().type === TokenType.NEWLINE) this.advance();
                    flushParagraph();
                } else {
                    // Single newline → space in the current paragraph
                    // But not when the newline is just before EOF (trailing newline)
                    if (currentParagraphInlines.length > 0 && this.peek().type !== TokenType.EOF) {
                        currentParagraphInlines.push({type: 'text', text: ' '});
                    }
                }
                continue;
            }

            // Comments: hidden but preserved
            if (tok.type === TokenType.COMMENT) {
                const comment = this.advance();
                currentParagraphInlines.push({
                    type: 'latexComment',
                    attrs: {content: comment.value, rawLatex: comment.value},
                });
                continue;
            }

            // Display math
            if (tok.type === TokenType.MATH_DISPLAY) {
                flushParagraph();
                const mathTok = this.advance();
                nodes.push({
                    type: 'latexMathBlock',
                    attrs: {latex: mathTok.value, rawLatex: mathTok.raw},
                });
                continue;
            }

            // Inline math
            if (tok.type === TokenType.MATH_INLINE) {
                const mathTok = this.advance();
                currentParagraphInlines.push({
                    type: 'latexMathInline',
                    attrs: {latex: mathTok.value, rawLatex: mathTok.raw},
                });
                continue;
            }

            // Commands
            if (tok.type === TokenType.COMMAND) {
                const cmdName = tok.value;

                // \begin{...}
                if (cmdName === 'begin') {
                    flushParagraph();
                    const beginTokIdx = this.pos;
                    this.advance(); // skip \begin
                    const envName = this.readBraceGroupText();

                    if (LIST_ENVIRONMENTS.has(envName)) {
                        nodes.push(this.parseListEnvironment(envName));
                    } else if (envName === 'figure') {
                        nodes.push(this.parseFigureEnvironment());
                    } else if (envName === 'table' || envName === 'tabular') {
                        nodes.push(this.parseTableEnvironment(envName));
                    } else if (envName === 'equation' || envName === 'align' || envName === 'equation*' || envName === 'align*') {
                        const content = this.readUntilEnd(envName);
                        const rawLatex = `\\begin{${envName}}${content}\\end{${envName}}`;
                        nodes.push({
                            type: 'latexMathBlock',
                            attrs: {latex: content.trim(), rawLatex},
                        });
                    } else if (envName === 'document') {
                        // Hidden preamble node — preserved for round-trip but not rendered
                        nodes.push({
                            type: 'latexPreamble',
                            attrs: {content: '\\begin{document}', rawLatex: '\\begin{document}'},
                        });
                        continue;
                    } else {
                        // Unknown environment → raw block
                        const content = this.readUntilEnd(envName);
                        const rawLatex = `\\begin{${envName}}${content}\\end{${envName}}`;
                        nodes.push({
                            type: 'latexRawBlock',
                            attrs: {content: rawLatex, rawLatex},
                        });
                    }
                    continue;
                }

                // \end{...} — stray ends (e.g., \end{document})
                if (cmdName === 'end') {
                    this.advance();
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        const endEnvName = this.readBraceGroupText();
                        if (endEnvName === 'document') {
                            flushParagraph();
                            nodes.push({
                                type: 'latexPreamble',
                                attrs: {content: `\\end{document}`, rawLatex: `\\end{document}`},
                            });
                        }
                    }
                    continue;
                }

                // Section commands
                if (cmdName in SECTION_COMMANDS) {
                    flushParagraph();
                    this.advance(); // skip command
                    const level = SECTION_COMMANDS[cmdName];
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        const titleTokens = this.readBraceGroupTokens();
                        const inlines = new ParserContext(titleTokens).parseInlines();
                        nodes.push({
                            type: 'heading',
                            attrs: {level},
                            content: inlines.length > 0 ? inlines : [{type: 'text', text: ' '}],
                        });
                    }
                    continue;
                }

                // Formatting commands
                if (cmdName in FORMATTING_COMMANDS) {
                    this.advance(); // skip command
                    const markType = FORMATTING_COMMANDS[cmdName];
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        const innerTokens = this.readBraceGroupTokens();
                        const inlines = new ParserContext(innerTokens).parseInlines();
                        // Apply mark to all inline nodes
                        for (const node of inlines) {
                            if (node.type === 'text') {
                                node.marks = [...(node.marks || []), {type: markType}];
                            }
                        }
                        currentParagraphInlines.push(...inlines);
                    }
                    continue;
                }

                // \item — should only appear inside lists, but handle gracefully
                if (cmdName === 'item') {
                    this.advance();
                    continue;
                }

                // Symbol commands (\dots, \ldots, etc.)
                if (cmdName in SYMBOL_COMMANDS) {
                    this.advance();
                    currentParagraphInlines.push({
                        type: 'latexRawInline',
                        attrs: {content: SYMBOL_COMMANDS[cmdName], rawLatex: `\\${cmdName}`},
                    });
                    continue;
                }

                // \href{url}{text}
                if (cmdName === 'href') {
                    this.advance();
                    let url = '';
                    let text = '';
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        url = this.readBraceGroupText();
                    }
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        text = this.readBraceGroupText();
                    }
                    const rawLatex = `\\href{${url}}{${text}}`;
                    currentParagraphInlines.push({
                        type: 'latexHref',
                        attrs: {url, text, rawLatex, isUrl: false},
                    });
                    continue;
                }

                // \url{address}
                if (cmdName === 'url') {
                    this.advance();
                    let url = '';
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        url = this.readBraceGroupText();
                    }
                    const rawLatex = `\\url{${url}}`;
                    currentParagraphInlines.push({
                        type: 'latexHref',
                        attrs: {url, text: url, rawLatex, isUrl: true},
                    });
                    continue;
                }

                // \label, \ref, \cite — inline raw
                if (['label', 'ref', 'cite', 'footnote', 'caption'].includes(cmdName)) {
                    const startIdx = this.pos;
                    this.advance();
                    let raw = `\\${cmdName}`;
                    if (this.peek().type === TokenType.OPEN_BRACKET) {
                        raw += '[' + (this.skipOptionalArg() || '') + ']';
                    }
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        raw += '{' + this.readBraceGroupText() + '}';
                    }
                    currentParagraphInlines.push({
                        type: 'latexRawInline',
                        attrs: {content: raw, rawLatex: raw},
                    });
                    continue;
                }

                // \input / \include — dedicated node with file path
                if (cmdName === 'input' || cmdName === 'include') {
                    flushParagraph();
                    this.advance();
                    let filePath = '';
                    let raw = `\\${cmdName}`;
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        filePath = this.readBraceGroupText();
                        raw += `{${filePath}}`;
                    }
                    nodes.push({
                        type: 'latexInput',
                        attrs: {filePath, rawLatex: raw},
                    });
                    continue;
                }

                // Preamble commands — hidden (documentclass, usepackage, etc.)
                if (['documentclass', 'usepackage'].includes(cmdName)) {
                    flushParagraph();
                    this.advance();
                    let raw = `\\${cmdName}`;
                    if (this.peek().type === TokenType.OPEN_BRACKET) {
                        raw += '[' + (this.skipOptionalArg() || '') + ']';
                    }
                    while (this.peek().type === TokenType.OPEN_BRACE) {
                        raw += '{' + this.readBraceGroupText() + '}';
                    }
                    nodes.push({
                        type: 'latexPreamble',
                        attrs: {content: raw, rawLatex: raw},
                    });
                    continue;
                }

                // \title{...}, \author{...}, \date{...} — rendered title block
                if (cmdName === 'title' || cmdName === 'author' || cmdName === 'date') {
                    flushParagraph();
                    this.advance();
                    let text = '';
                    let raw = `\\${cmdName}`;
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        text = this.readBraceGroupText();
                        raw += `{${text}}`;
                    }
                    nodes.push({
                        type: 'latexTitle',
                        attrs: {text, kind: cmdName, rawLatex: raw},
                    });
                    continue;
                }

                // \maketitle — hidden (title/author/date already shown)
                if (cmdName === 'maketitle') {
                    flushParagraph();
                    this.advance();
                    nodes.push({
                        type: 'latexPreamble',
                        attrs: {content: '\\maketitle', rawLatex: '\\maketitle'},
                    });
                    continue;
                }

                // Other preamble-like commands — raw block
                if (['tableofcontents', 'newcommand', 'renewcommand', 'setlength',
                     'pagestyle', 'thispagestyle', 'bibliographystyle', 'bibliography'].includes(cmdName)) {
                    flushParagraph();
                    this.advance();
                    let raw = `\\${cmdName}`;
                    if (this.peek().type === TokenType.OPEN_BRACKET) {
                        raw += '[' + (this.skipOptionalArg() || '') + ']';
                    }
                    while (this.peek().type === TokenType.OPEN_BRACE) {
                        raw += '{' + this.readBraceGroupText() + '}';
                    }
                    nodes.push({
                        type: 'latexRawBlock',
                        attrs: {content: raw, rawLatex: raw},
                    });
                    continue;
                }

                // Other unknown commands → raw inline
                this.advance();
                let raw = `\\${cmdName}`;
                if (this.peek().type === TokenType.OPEN_BRACKET) {
                    raw += '[' + (this.skipOptionalArg() || '') + ']';
                }
                if (this.peek().type === TokenType.OPEN_BRACE) {
                    raw += '{' + this.readBraceGroupText() + '}';
                }
                currentParagraphInlines.push({
                    type: 'latexRawInline',
                    attrs: {content: raw, rawLatex: raw},
                });
                continue;
            }

            // Plain text
            if (tok.type === TokenType.TEXT) {
                const textTok = this.advance();
                currentParagraphInlines.push({type: 'text', text: textTok.value});
                continue;
            }

            // Stray braces, brackets, ampersands, double backslash — text
            if ([TokenType.OPEN_BRACE, TokenType.CLOSE_BRACE, TokenType.OPEN_BRACKET,
                 TokenType.CLOSE_BRACKET, TokenType.AMPERSAND, TokenType.DOUBLE_BACKSLASH].includes(tok.type)) {
                const t = this.advance();
                currentParagraphInlines.push({type: 'text', text: t.value});
                continue;
            }

            // Fallback
            this.advance();
        }

        flushParagraph();

        // Ensure \end{document} is always the last node. Any content that
        // appeared after it in the source (previously lost to the compiler)
        // is surfaced inside the document body so the user can see and fix it.
        const endDocIdx = nodes.findIndex(
            n => n.type === 'latexPreamble' && n.attrs?.content === '\\end{document}',
        );
        if (endDocIdx !== -1 && endDocIdx !== nodes.length - 1) {
            const [endDocNode] = nodes.splice(endDocIdx, 1);
            nodes.push(endDocNode);
        }

        return nodes;
    }

    /** Parse inline content (inside brace groups, headings, etc.) */
    parseInlines(): TipTapNode[] {
        const inlines: TipTapNode[] = [];

        while (this.peek().type !== TokenType.EOF) {
            const tok = this.peek();

            if (tok.type === TokenType.TEXT) {
                inlines.push({type: 'text', text: this.advance().value});
                continue;
            }

            if (tok.type === TokenType.MATH_INLINE) {
                const mathTok = this.advance();
                inlines.push({
                    type: 'latexMathInline',
                    attrs: {latex: mathTok.value, rawLatex: mathTok.raw},
                });
                continue;
            }

            if (tok.type === TokenType.COMMAND) {
                const cmdName = tok.value;

                if (cmdName in FORMATTING_COMMANDS) {
                    this.advance();
                    const markType = FORMATTING_COMMANDS[cmdName];
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        const innerTokens = this.readBraceGroupTokens();
                        const nested = new ParserContext(innerTokens).parseInlines();
                        for (const node of nested) {
                            if (node.type === 'text') {
                                node.marks = [...(node.marks || []), {type: markType}];
                            }
                        }
                        inlines.push(...nested);
                    }
                    continue;
                }

                // Symbol commands (\dots, \ldots, etc.)
                if (cmdName in SYMBOL_COMMANDS) {
                    this.advance();
                    inlines.push({
                        type: 'latexRawInline',
                        attrs: {content: SYMBOL_COMMANDS[cmdName], rawLatex: `\\${cmdName}`},
                    });
                    continue;
                }

                // \href{url}{text}
                if (cmdName === 'href') {
                    this.advance();
                    let url = '';
                    let text = '';
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        url = this.readBraceGroupText();
                    }
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        text = this.readBraceGroupText();
                    }
                    const rawLatex = `\\href{${url}}{${text}}`;
                    inlines.push({
                        type: 'latexHref',
                        attrs: {url, text, rawLatex, isUrl: false},
                    });
                    continue;
                }

                // \url{address}
                if (cmdName === 'url') {
                    this.advance();
                    let url = '';
                    if (this.peek().type === TokenType.OPEN_BRACE) {
                        url = this.readBraceGroupText();
                    }
                    const rawLatex = `\\url{${url}}`;
                    inlines.push({
                        type: 'latexHref',
                        attrs: {url, text: url, rawLatex, isUrl: true},
                    });
                    continue;
                }

                // Other commands → raw inline
                this.advance();
                let raw = `\\${cmdName}`;
                if (this.peek().type === TokenType.OPEN_BRACKET) {
                    raw += '[' + (this.skipOptionalArg() || '') + ']';
                }
                if (this.peek().type === TokenType.OPEN_BRACE) {
                    raw += '{' + this.readBraceGroupText() + '}';
                }
                inlines.push({
                    type: 'latexRawInline',
                    attrs: {content: raw, rawLatex: raw},
                });
                continue;
            }

            if (tok.type === TokenType.NEWLINE) {
                this.advance();
                inlines.push({type: 'text', text: ' '});
                continue;
            }

            // Anything else → text
            inlines.push({type: 'text', text: this.advance().raw});
        }

        return inlines;
    }

    /** Parse \begin{itemize} or \begin{enumerate} */
    private parseListEnvironment(envName: string): TipTapNode {
        this.skipOptionalArg(); // skip optional placement arg
        const listType = envName === 'enumerate' ? 'orderedList' : 'bulletList';
        const items: TipTapNode[] = [];

        // Collect raw for the environment
        const rawParts: string[] = [`\\begin{${envName}}`];

        while (this.peek().type !== TokenType.EOF) {
            // Check for \end{envName}
            if (this.peek().type === TokenType.COMMAND && this.peek().value === 'end') {
                const savedPos = this.pos;
                this.advance();
                if (this.peek().type === TokenType.OPEN_BRACE) {
                    const name = this.readBraceGroupText();
                    if (name === envName) {
                        break;
                    }
                    // Not our end, restore
                    this.pos = savedPos;
                }
            }

            // \item starts a list item
            if (this.peek().type === TokenType.COMMAND && this.peek().value === 'item') {
                this.advance();
                this.skipOptionalArg(); // skip optional label

                // Collect inline content until next \item or \end
                const itemInlines: TipTapNode[] = [];
                while (this.peek().type !== TokenType.EOF) {
                    if (this.peek().type === TokenType.COMMAND &&
                        (this.peek().value === 'item' || this.peek().value === 'end')) {
                        break;
                    }

                    const tok = this.peek();
                    if (tok.type === TokenType.NEWLINE) {
                        this.advance();
                        if (itemInlines.length > 0) {
                            itemInlines.push({type: 'text', text: ' '});
                        }
                        continue;
                    }
                    if (tok.type === TokenType.TEXT) {
                        let text = this.advance().value;
                        // Trim leading whitespace from first text in list item —
                        // the serializer adds its own space after \item
                        if (itemInlines.length === 0) {
                            text = text.trimStart();
                        }
                        if (text) {
                            itemInlines.push({type: 'text', text});
                        }
                        continue;
                    }
                    if (tok.type === TokenType.MATH_INLINE) {
                        const m = this.advance();
                        itemInlines.push({type: 'latexMathInline', attrs: {latex: m.value, rawLatex: m.raw}});
                        continue;
                    }
                    if (tok.type === TokenType.COMMAND) {
                        const cmdName = tok.value;
                        if (cmdName in FORMATTING_COMMANDS) {
                            this.advance();
                            const markType = FORMATTING_COMMANDS[cmdName];
                            if (this.peek().type === TokenType.OPEN_BRACE) {
                                const innerTokens = this.readBraceGroupTokens();
                                const nested = new ParserContext(innerTokens).parseInlines();
                                for (const node of nested) {
                                    if (node.type === 'text') {
                                        node.marks = [...(node.marks || []), {type: markType}];
                                    }
                                }
                                itemInlines.push(...nested);
                            }
                            continue;
                        }
                        // Nested list
                        if (cmdName === 'begin') {
                            const savedPos = this.pos;
                            this.advance();
                            if (this.peek().type === TokenType.OPEN_BRACE) {
                                const innerEnvName = this.readBraceGroupText();
                                if (LIST_ENVIRONMENTS.has(innerEnvName)) {
                                    // Flush current item, parse nested list
                                    if (itemInlines.length > 0) {
                                        items.push({
                                            type: 'listItem',
                                            content: [{type: 'paragraph', content: [...itemInlines]}],
                                        });
                                        itemInlines.length = 0;
                                    }
                                    const nestedList = this.parseListEnvironment(innerEnvName);
                                    // Add nested list to current item or as new item
                                    if (items.length > 0) {
                                        items[items.length - 1].content!.push(nestedList);
                                    } else {
                                        items.push({type: 'listItem', content: [nestedList]});
                                    }
                                    continue;
                                }
                                this.pos = savedPos;
                            } else {
                                this.pos = savedPos;
                            }
                        }
                        // Symbol commands (\dots, \ldots, etc.)
                        if (cmdName in SYMBOL_COMMANDS) {
                            this.advance();
                            itemInlines.push({
                                type: 'latexRawInline',
                                attrs: {content: SYMBOL_COMMANDS[cmdName], rawLatex: `\\${cmdName}`},
                            });
                            continue;
                        }
                        // \href{url}{text}
                        if (cmdName === 'href') {
                            this.advance();
                            let url = '';
                            let text = '';
                            if (this.peek().type === TokenType.OPEN_BRACE) {
                                url = this.readBraceGroupText();
                            }
                            if (this.peek().type === TokenType.OPEN_BRACE) {
                                text = this.readBraceGroupText();
                            }
                            const rawLatex = `\\href{${url}}{${text}}`;
                            itemInlines.push({
                                type: 'latexHref',
                                attrs: {url, text, rawLatex, isUrl: false},
                            });
                            continue;
                        }
                        // \url{address}
                        if (cmdName === 'url') {
                            this.advance();
                            let url = '';
                            if (this.peek().type === TokenType.OPEN_BRACE) {
                                url = this.readBraceGroupText();
                            }
                            const rawLatex = `\\url{${url}}`;
                            itemInlines.push({
                                type: 'latexHref',
                                attrs: {url, text: url, rawLatex, isUrl: true},
                            });
                            continue;
                        }
                        // Unknown command → raw inline
                        this.advance();
                        let raw = `\\${cmdName}`;
                        if (this.peek().type === TokenType.OPEN_BRACE) {
                            raw += '{' + this.readBraceGroupText() + '}';
                        }
                        itemInlines.push({type: 'latexRawInline', attrs: {content: raw, rawLatex: raw}});
                        continue;
                    }
                    // Other tokens
                    itemInlines.push({type: 'text', text: this.advance().raw});
                }

                // Trim trailing whitespace
                while (itemInlines.length > 0 && itemInlines[itemInlines.length - 1].text?.trim() === '') {
                    itemInlines.pop();
                }

                if (itemInlines.length > 0) {
                    items.push({
                        type: 'listItem',
                        content: [{type: 'paragraph', content: itemInlines}],
                    });
                }
                continue;
            }

            // Skip whitespace between items
            if (this.peek().type === TokenType.NEWLINE || this.peek().type === TokenType.TEXT) {
                if (this.peek().type === TokenType.TEXT && this.peek().value.trim() === '') {
                    this.advance();
                    continue;
                }
                if (this.peek().type === TokenType.NEWLINE) {
                    this.advance();
                    continue;
                }
            }

            // Unexpected tokens — skip
            this.advance();
        }

        return {
            type: listType,
            content: items.length > 0 ? items : [{type: 'listItem', content: [{type: 'paragraph', content: [{type: 'text', text: ' '}]}]}],
        };
    }

    /** Parse \begin{figure} */
    private parseFigureEnvironment(): TipTapNode {
        this.skipOptionalArg(); // [h], [t], etc.
        const content = this.readUntilEnd('figure');
        const rawLatex = `\\begin{figure}${content}\\end{figure}`;

        // Try to extract caption and image path
        let caption = '';
        let imagePath = '';
        const captionMatch = content.match(/\\caption\{([^}]*)}/);
        if (captionMatch) caption = captionMatch[1];
        const imgMatch = content.match(/\\includegraphics(?:\[[^\]]*])?\{([^}]*)}/);
        if (imgMatch) imagePath = imgMatch[1];

        return {
            type: 'latexFigure',
            attrs: {caption, imagePath, rawLatex},
        };
    }

    /** Parse \begin{table} or \begin{tabular} */
    private parseTableEnvironment(envName: string): TipTapNode {
        const placement = this.skipOptionalArg() || ''; // [h], [t], etc.
        const content = this.readUntilEnd(envName);

        let tabularContent = content;
        let colSpec = '';
        let rawBeforeTabular = '';
        let rawAfterTabular = '';
        const isTableEnv = envName === 'table';

        if (isTableEnv) {
            // Find inner \begin{tabular}{colSpec}
            const tabularMatch = content.match(/\\begin\{tabular\}\s*\{([^}]*)\}/);
            if (tabularMatch) {
                colSpec = tabularMatch[1];
                const tabularHeaderEnd = tabularMatch.index! + tabularMatch[0].length;
                const innerEnd = content.indexOf('\\end{tabular}');
                if (innerEnd !== -1) {
                    rawBeforeTabular = content.slice(0, tabularMatch.index!).trim();
                    rawAfterTabular = content.slice(innerEnd + '\\end{tabular}'.length).trim();
                    tabularContent = content.slice(tabularHeaderEnd, innerEnd);
                }
            } else {
                // No inner tabular found — fall back to raw block
                const rawLatex = `\\begin{table}${placement ? `[${placement}]` : ''}${content}\\end{table}`;
                return {type: 'latexRawBlock', attrs: {content: rawLatex, rawLatex}};
            }
        } else {
            // Direct tabular — column spec like {|c|c|} is at the start of content
            const colMatch = content.match(/^\{([^}]*)}/);
            if (colMatch) {
                colSpec = colMatch[1];
                tabularContent = content.slice(colMatch[0].length);
            }
        }

        // Parse tabular rows (split by \\ and rows by &)
        const rows: TipTapNode[] = [];
        const rowStrings = tabularContent.split('\\\\').filter(r => r.trim());

        for (let ri = 0; ri < rowStrings.length; ri++) {
            const rowStr = rowStrings[ri].replace(/\\hline/g, '').trim();
            if (!rowStr) continue;
            const cells = rowStr.split('&');
            const cellNodes: TipTapNode[] = cells.map(cellText => {
                const trimmed = cellText.trim();
                let cellContent: TipTapNode[];
                if (trimmed) {
                    // Parse cell content through tokenizer + inline parser
                    // to handle formatting, math, and unknown commands
                    const cellTokens = tokenize(trimmed);
                    const inlines = new ParserContext(cellTokens).parseInlines();
                    cellContent = inlines.length > 0 ? inlines : [{type: 'text', text: ' '}];
                } else {
                    cellContent = [{type: 'text', text: ' '}];
                }
                return {
                    type: ri === 0 ? 'tableHeader' : 'tableCell',
                    content: [{type: 'paragraph', content: cellContent}],
                };
            });
            rows.push({
                type: 'tableRow',
                content: cellNodes,
            });
        }

        if (rows.length === 0) {
            // Fallback: raw block
            const rawLatex = `\\begin{${envName}}${content}\\end{${envName}}`;
            return {
                type: 'latexRawBlock',
                attrs: {content: rawLatex, rawLatex},
            };
        }

        return {
            type: 'table',
            attrs: {
                colSpec,
                placement,
                rawBeforeTabular,
                rawAfterTabular,
                isTableEnv,
            },
            content: rows,
        };
    }
}
