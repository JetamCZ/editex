import {describe, it, expect} from 'vitest';
import {parseLatex} from './index';
import {tokenize} from './tokenizer';
import {TokenType} from './types';

describe('tokenizer', () => {
    it('should tokenize plain text', () => {
        const tokens = tokenize('Hello world');
        expect(tokens[0]).toMatchObject({type: TokenType.TEXT, value: 'Hello world'});
        expect(tokens[1]).toMatchObject({type: TokenType.EOF});
    });

    it('should tokenize commands', () => {
        const tokens = tokenize('\\textbf{bold}');
        expect(tokens[0]).toMatchObject({type: TokenType.COMMAND, value: 'textbf'});
        expect(tokens[1]).toMatchObject({type: TokenType.OPEN_BRACE});
        expect(tokens[2]).toMatchObject({type: TokenType.TEXT, value: 'bold'});
        expect(tokens[3]).toMatchObject({type: TokenType.CLOSE_BRACE});
    });

    it('should tokenize inline math', () => {
        const tokens = tokenize('$x^2$');
        expect(tokens[0]).toMatchObject({type: TokenType.MATH_INLINE, value: 'x^2'});
    });

    it('should tokenize display math with $$', () => {
        const tokens = tokenize('$$E=mc^2$$');
        expect(tokens[0]).toMatchObject({type: TokenType.MATH_DISPLAY, value: 'E=mc^2'});
    });

    it('should tokenize display math with \\[...\\]', () => {
        const tokens = tokenize('\\[a+b\\]');
        expect(tokens[0]).toMatchObject({type: TokenType.MATH_DISPLAY, value: 'a+b'});
    });

    it('should tokenize comments', () => {
        const tokens = tokenize('% this is a comment\ntext');
        expect(tokens[0]).toMatchObject({type: TokenType.COMMENT, value: '% this is a comment'});
        expect(tokens[1]).toMatchObject({type: TokenType.NEWLINE});
        expect(tokens[2]).toMatchObject({type: TokenType.TEXT, value: 'text'});
    });

    it('should tokenize newlines', () => {
        const tokens = tokenize('a\n\nb');
        expect(tokens[0]).toMatchObject({type: TokenType.TEXT, value: 'a'});
        expect(tokens[1]).toMatchObject({type: TokenType.NEWLINE});
        expect(tokens[2]).toMatchObject({type: TokenType.NEWLINE});
        expect(tokens[3]).toMatchObject({type: TokenType.TEXT, value: 'b'});
    });

    it('should tokenize escaped special characters', () => {
        const tokens = tokenize('\\$ \\%');
        expect(tokens[0]).toMatchObject({type: TokenType.TEXT, value: '$'});
        expect(tokens[1]).toMatchObject({type: TokenType.TEXT, value: ' '});
        expect(tokens[2]).toMatchObject({type: TokenType.TEXT, value: '%'});
    });

    it('should tokenize double backslash', () => {
        const tokens = tokenize('a \\\\ b');
        expect(tokens[0]).toMatchObject({type: TokenType.TEXT, value: 'a '});
        expect(tokens[1]).toMatchObject({type: TokenType.DOUBLE_BACKSLASH});
        expect(tokens[2]).toMatchObject({type: TokenType.TEXT, value: ' b'});
    });

    it('should tokenize ampersand', () => {
        const tokens = tokenize('a & b');
        expect(tokens[0]).toMatchObject({type: TokenType.TEXT, value: 'a '});
        expect(tokens[1]).toMatchObject({type: TokenType.AMPERSAND});
        expect(tokens[2]).toMatchObject({type: TokenType.TEXT, value: ' b'});
    });
});

describe('parser', () => {
    describe('paragraphs', () => {
        it('should parse plain text into a paragraph', () => {
            const doc = parseLatex('Hello world');
            expect(doc.content).toHaveLength(1);
            expect(doc.content[0].type).toBe('paragraph');
            expect(doc.content[0].content![0].text).toBe('Hello world');
        });

        it('should split on blank lines into separate paragraphs', () => {
            const doc = parseLatex('First paragraph.\n\nSecond paragraph.');
            expect(doc.content).toHaveLength(2);
            expect(doc.content[0].type).toBe('paragraph');
            expect(doc.content[1].type).toBe('paragraph');
        });

        it('should treat single newline as space', () => {
            const doc = parseLatex('line one\nline two');
            expect(doc.content).toHaveLength(1);
            const texts = doc.content[0].content!.map(n => n.text).join('');
            expect(texts).toBe('line one line two');
        });
    });

    describe('sections', () => {
        it('should parse \\section as heading level 1', () => {
            const doc = parseLatex('\\section{Introduction}');
            expect(doc.content).toHaveLength(1);
            expect(doc.content[0].type).toBe('heading');
            expect(doc.content[0].attrs?.level).toBe(1);
            expect(doc.content[0].content![0].text).toBe('Introduction');
        });

        it('should parse \\subsection as heading level 2', () => {
            const doc = parseLatex('\\subsection{Details}');
            expect(doc.content[0].attrs?.level).toBe(2);
        });

        it('should parse \\subsubsection as heading level 3', () => {
            const doc = parseLatex('\\subsubsection{Sub-details}');
            expect(doc.content[0].attrs?.level).toBe(3);
        });
    });

    describe('text formatting', () => {
        it('should parse \\textbf as bold mark', () => {
            const doc = parseLatex('\\textbf{bold text}');
            const textNode = doc.content[0].content![0];
            expect(textNode.text).toBe('bold text');
            expect(textNode.marks).toContainEqual({type: 'bold'});
        });

        it('should parse \\textit as italic mark', () => {
            const doc = parseLatex('\\textit{italic text}');
            const textNode = doc.content[0].content![0];
            expect(textNode.marks).toContainEqual({type: 'italic'});
        });

        it('should parse \\emph as italic mark', () => {
            const doc = parseLatex('\\emph{emphasized}');
            const textNode = doc.content[0].content![0];
            expect(textNode.marks).toContainEqual({type: 'italic'});
        });

        it('should parse \\underline as underline mark', () => {
            const doc = parseLatex('\\underline{underlined}');
            const textNode = doc.content[0].content![0];
            expect(textNode.marks).toContainEqual({type: 'underline'});
        });

        it('should handle nested formatting', () => {
            const doc = parseLatex('\\textbf{\\textit{bold italic}}');
            const textNode = doc.content[0].content![0];
            expect(textNode.text).toBe('bold italic');
            expect(textNode.marks).toContainEqual({type: 'bold'});
            expect(textNode.marks).toContainEqual({type: 'italic'});
        });

        it('should handle mixed text and formatting', () => {
            const doc = parseLatex('normal \\textbf{bold} normal');
            const nodes = doc.content[0].content!;
            expect(nodes[0].text).toBe('normal ');
            expect(nodes[1].text).toBe('bold');
            expect(nodes[1].marks).toContainEqual({type: 'bold'});
            expect(nodes[2].text).toBe(' normal');
        });
    });

    describe('lists', () => {
        it('should parse itemize as bulletList', () => {
            const doc = parseLatex('\\begin{itemize}\n\\item First\n\\item Second\n\\end{itemize}');
            expect(doc.content).toHaveLength(1);
            expect(doc.content[0].type).toBe('bulletList');
            expect(doc.content[0].content).toHaveLength(2);
            expect(doc.content[0].content![0].type).toBe('listItem');
        });

        it('should parse enumerate as orderedList', () => {
            const doc = parseLatex('\\begin{enumerate}\n\\item First\n\\item Second\n\\end{enumerate}');
            expect(doc.content[0].type).toBe('orderedList');
        });

        it('should extract item content', () => {
            const doc = parseLatex('\\begin{itemize}\n\\item Hello world\n\\end{itemize}');
            const paragraph = doc.content[0].content![0].content![0]; // listItem > paragraph
            const texts = paragraph.content!.map(n => n.text?.trim()).filter(Boolean).join(' ');
            expect(texts).toContain('Hello world');
        });

        it('should trim leading whitespace from item content', () => {
            const doc = parseLatex('\\begin{itemize}\n    \\item A\n    \\item B\n\\end{itemize}');
            const items = doc.content[0].content!;
            // First text node in each item should not have a leading space
            const firstItemText = items[0].content![0].content![0].text;
            const secondItemText = items[1].content![0].content![0].text;
            expect(firstItemText).toBe('A');
            expect(secondItemText).toBe('B');
        });
    });

    describe('math', () => {
        it('should parse inline math', () => {
            const doc = parseLatex('The formula $x^2$ is nice.');
            const nodes = doc.content[0].content!;
            const mathNode = nodes.find(n => n.type === 'latexMathInline');
            expect(mathNode).toBeDefined();
            expect(mathNode!.attrs?.latex).toBe('x^2');
        });

        it('should parse display math with $$', () => {
            const doc = parseLatex('$$E=mc^2$$');
            expect(doc.content[0].type).toBe('latexMathBlock');
            expect(doc.content[0].attrs?.latex).toBe('E=mc^2');
        });

        it('should parse equation environment as math block', () => {
            const doc = parseLatex('\\begin{equation}\nx = y\n\\end{equation}');
            expect(doc.content[0].type).toBe('latexMathBlock');
        });
    });

    describe('figures', () => {
        it('should parse figure environment', () => {
            const latex = `\\begin{figure}[h]
    \\centering
    \\includegraphics[width=0.5\\textwidth]{photo.png}
    \\caption{My photo}
\\end{figure}`;
            const doc = parseLatex(latex);
            expect(doc.content[0].type).toBe('latexFigure');
            expect(doc.content[0].attrs?.imagePath).toBe('photo.png');
            expect(doc.content[0].attrs?.caption).toBe('My photo');
        });
    });

    describe('tables', () => {
        it('should parse table environment into table nodes', () => {
            const latex = `\\begin{table}[h]
    \\centering
    \\begin{tabular}{|c|c|}
        \\hline
        A & B \\\\
        \\hline
        1 & 2 \\\\
        \\hline
    \\end{tabular}
\\end{table}`;
            const doc = parseLatex(latex);
            expect(doc.content[0].type).toBe('table');
            expect(doc.content[0].content!.length).toBeGreaterThanOrEqual(2);
            expect(doc.content[0].content![0].type).toBe('tableRow');
        });

        it('should store table metadata as attributes', () => {
            const latex = `\\begin{table}[h]
    \\centering
    \\begin{tabular}{|c|c|}
        \\hline
        A & B \\\\
        \\hline
    \\end{tabular}
\\end{table}`;
            const doc = parseLatex(latex);
            const table = doc.content[0];
            expect(table.attrs?.colSpec).toBe('|c|c|');
            expect(table.attrs?.placement).toBe('h');
            expect(table.attrs?.isTableEnv).toBe(true);
        });

        it('should preserve caption and label in rawBeforeTabular', () => {
            const latex = `\\begin{table}[h]
    \\centering
    \\caption{My Table}
    \\label{tab:mytable}
    \\begin{tabular}{|c|c|}
        \\hline
        A & B \\\\
        \\hline
    \\end{tabular}
\\end{table}`;
            const doc = parseLatex(latex);
            const table = doc.content[0];
            expect(table.attrs?.rawBeforeTabular).toContain('\\caption{My Table}');
            expect(table.attrs?.rawBeforeTabular).toContain('\\label{tab:mytable}');
            expect(table.attrs?.rawBeforeTabular).toContain('\\centering');
        });

        it('should preserve caption after tabular in rawAfterTabular', () => {
            const latex = `\\begin{table}[h]
    \\centering
    \\begin{tabular}{|c|c|}
        \\hline
        A & B \\\\
        \\hline
    \\end{tabular}
    \\caption{After caption}
    \\label{tab:after}
\\end{table}`;
            const doc = parseLatex(latex);
            const table = doc.content[0];
            expect(table.attrs?.rawAfterTabular).toContain('\\caption{After caption}');
            expect(table.attrs?.rawAfterTabular).toContain('\\label{tab:after}');
        });

        it('should parse cell content with formatting', () => {
            const latex = `\\begin{tabular}{|c|c|}
        \\hline
        \\textbf{Header} & Normal \\\\
        \\hline
\\end{tabular}`;
            const doc = parseLatex(latex);
            const table = doc.content[0];
            const firstCell = table.content![0].content![0]; // first row, first cell
            const paragraph = firstCell.content![0];
            const textNode = paragraph.content![0];
            expect(textNode.text).toBe('Header');
            expect(textNode.marks).toContainEqual({type: 'bold'});
        });

        it('should parse cell content with math', () => {
            const latex = `\\begin{tabular}{|c|c|}
        \\hline
        $x^2$ & Normal \\\\
        \\hline
\\end{tabular}`;
            const doc = parseLatex(latex);
            const table = doc.content[0];
            const firstCell = table.content![0].content![0];
            const paragraph = firstCell.content![0];
            const mathNode = paragraph.content![0];
            expect(mathNode.type).toBe('latexMathInline');
            expect(mathNode.attrs?.latex).toBe('x^2');
        });

        it('should set isTableEnv=false for standalone tabular', () => {
            const latex = `\\begin{tabular}{|c|c|}
        \\hline
        A & B \\\\
        \\hline
\\end{tabular}`;
            const doc = parseLatex(latex);
            expect(doc.content[0].attrs?.isTableEnv).toBe(false);
        });

        it('should not consume content after the table', () => {
            const latex = `\\begin{table}[h]
    \\centering
    \\begin{tabular}{|c|c|}
        \\hline
        A & B \\\\
        \\hline
    \\end{tabular}
\\end{table}

This paragraph comes after the table.`;
            const doc = parseLatex(latex);
            expect(doc.content.length).toBeGreaterThanOrEqual(2);
            const lastNode = doc.content[doc.content.length - 1];
            expect(lastNode.type).toBe('paragraph');
            const text = lastNode.content!.map(n => n.text).join('');
            expect(text).toContain('after the table');
        });
    });

    describe('raw blocks and inlines', () => {
        it('should parse preamble commands as raw blocks', () => {
            const doc = parseLatex('\\documentclass{article}');
            expect(doc.content[0].type).toBe('latexRawBlock');
            expect(doc.content[0].attrs?.content).toBe('\\documentclass{article}');
        });

        it('should parse \\usepackage as raw block', () => {
            const doc = parseLatex('\\usepackage{amsmath}');
            expect(doc.content[0].type).toBe('latexRawBlock');
        });

        it('should parse unknown commands as raw inline', () => {
            const doc = parseLatex('Some \\customcmd{arg} text');
            const nodes = doc.content[0].content!;
            const rawNode = nodes.find(n => n.type === 'latexRawInline');
            expect(rawNode).toBeDefined();
            expect(rawNode!.attrs?.content).toBe('\\customcmd{arg}');
        });

        it('should parse unknown environments as raw block', () => {
            const doc = parseLatex('\\begin{lstlisting}\ncode here\n\\end{lstlisting}');
            expect(doc.content[0].type).toBe('latexRawBlock');
        });
    });

    describe('content after block elements', () => {
        it('should render content after a list', () => {
            const doc = parseLatex('\\begin{itemize}\n\\item One\n\\end{itemize}\n\nAfter list.');
            const lastNode = doc.content[doc.content.length - 1];
            expect(lastNode.type).toBe('paragraph');
            const text = lastNode.content!.map(n => n.text).join('');
            expect(text).toContain('After list');
        });

        it('should render content after a figure', () => {
            const doc = parseLatex('\\begin{figure}[h]\n\\end{figure}\n\nAfter figure.');
            const lastNode = doc.content[doc.content.length - 1];
            expect(lastNode.type).toBe('paragraph');
        });

        it('should render content after display math', () => {
            const doc = parseLatex('$$x^2$$\n\nAfter math.');
            expect(doc.content.length).toBeGreaterThanOrEqual(2);
            const lastNode = doc.content[doc.content.length - 1];
            expect(lastNode.type).toBe('paragraph');
        });

        it('should render content after raw blocks', () => {
            const doc = parseLatex('\\documentclass{article}\n\nSome text here.');
            expect(doc.content.length).toBeGreaterThanOrEqual(2);
            const lastNode = doc.content[doc.content.length - 1];
            expect(lastNode.type).toBe('paragraph');
        });
    });

    describe('complex documents', () => {
        it('should parse a typical LaTeX document', () => {
            const latex = `\\documentclass{article}
\\usepackage{amsmath}

\\begin{document}

\\section{Introduction}

This is the first paragraph with \\textbf{bold} and $x^2$ math.

\\begin{itemize}
\\item First item
\\item Second item
\\end{itemize}

\\subsection{Details}

More text here.

\\end{document}`;
            const doc = parseLatex(latex);
            // Should have: raw block (documentclass), raw block (usepackage),
            // heading, paragraph, bulletList, heading, paragraph
            expect(doc.content.length).toBeGreaterThanOrEqual(5);

            const types = doc.content.map(n => n.type);
            expect(types).toContain('heading');
            expect(types).toContain('paragraph');
            expect(types).toContain('bulletList');
        });
    });
});
