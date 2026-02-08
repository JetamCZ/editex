import {describe, it, expect} from 'vitest';
import {parseLatex} from '../latex-parser';
import {serializeToLatex} from './index';

describe('serializer', () => {
    describe('paragraphs', () => {
        it('should serialize a simple paragraph', () => {
            const doc = parseLatex('Hello world');
            const result = serializeToLatex(doc);
            expect(result.trim()).toBe('Hello world');
        });

        it('should serialize multiple paragraphs with blank lines', () => {
            const doc = parseLatex('First.\n\nSecond.');
            const result = serializeToLatex(doc);
            expect(result).toContain('First.');
            expect(result).toContain('Second.');
            // Should have separation between paragraphs
            expect(result.indexOf('Second.')).toBeGreaterThan(result.indexOf('First.') + 6);
        });
    });

    describe('headings', () => {
        it('should serialize heading level 1 as \\section', () => {
            const doc = parseLatex('\\section{Title}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\section{Title}');
        });

        it('should serialize heading level 2 as \\subsection', () => {
            const doc = parseLatex('\\subsection{Sub}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\subsection{Sub}');
        });

        it('should serialize heading level 3 as \\subsubsection', () => {
            const doc = parseLatex('\\subsubsection{SubSub}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\subsubsection{SubSub}');
        });
    });

    describe('text formatting', () => {
        it('should serialize bold text', () => {
            const doc = parseLatex('\\textbf{bold}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\textbf{bold}');
        });

        it('should serialize italic text', () => {
            const doc = parseLatex('\\textit{italic}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\textit{italic}');
        });

        it('should serialize underline text', () => {
            const doc = parseLatex('\\underline{under}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\underline{under}');
        });

        it('should serialize mixed text and formatting', () => {
            const doc = parseLatex('normal \\textbf{bold} normal');
            const result = serializeToLatex(doc);
            expect(result).toContain('normal');
            expect(result).toContain('\\textbf{bold}');
        });
    });

    describe('lists', () => {
        it('should serialize bullet list', () => {
            const doc = parseLatex('\\begin{itemize}\n\\item First\n\\item Second\n\\end{itemize}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\begin{itemize}');
            expect(result).toContain('\\item');
            expect(result).toContain('\\end{itemize}');
            expect(result).toContain('First');
            expect(result).toContain('Second');
        });

        it('should serialize ordered list', () => {
            const doc = parseLatex('\\begin{enumerate}\n\\item A\n\\item B\n\\end{enumerate}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\begin{enumerate}');
            expect(result).toContain('\\end{enumerate}');
        });
    });

    describe('math', () => {
        it('should serialize inline math via rawLatex', () => {
            const doc = parseLatex('The $x^2$ formula');
            const result = serializeToLatex(doc);
            expect(result).toContain('$x^2$');
        });

        it('should serialize display math via rawLatex', () => {
            const doc = parseLatex('$$E=mc^2$$');
            const result = serializeToLatex(doc);
            expect(result).toContain('$$E=mc^2$$');
        });
    });

    describe('raw blocks', () => {
        it('should serialize raw blocks via rawLatex', () => {
            const doc = parseLatex('\\documentclass{article}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\documentclass{article}');
        });

        it('should serialize unknown environments via rawLatex', () => {
            const doc = parseLatex('\\begin{lstlisting}\ncode\n\\end{lstlisting}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\begin{lstlisting}');
            expect(result).toContain('\\end{lstlisting}');
        });
    });

    describe('raw inlines', () => {
        it('should serialize raw inline commands via rawLatex', () => {
            const doc = parseLatex('See \\ref{fig:1}');
            const result = serializeToLatex(doc);
            expect(result).toContain('\\ref{fig:1}');
        });
    });

    describe('figures', () => {
        it('should serialize figures via rawLatex', () => {
            const latex = `\\begin{figure}[h]
    \\centering
    \\includegraphics{img.png}
    \\caption{My caption}
\\end{figure}`;
            const doc = parseLatex(latex);
            const result = serializeToLatex(doc);
            expect(result).toContain('\\begin{figure}');
            expect(result).toContain('\\end{figure}');
            expect(result).toContain('img.png');
        });
    });

    describe('tables', () => {
        it('should serialize table with preserved metadata', () => {
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
            const result = serializeToLatex(doc);
            expect(result).toContain('\\begin{table}[h]');
            expect(result).toContain('\\centering');
            expect(result).toContain('\\begin{tabular}{|c|c|}');
            expect(result).toContain('\\end{tabular}');
            expect(result).toContain('\\end{table}');
            expect(result).toContain('A & B');
            expect(result).toContain('1 & 2');
        });

        it('should serialize table with caption and label', () => {
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
            const result = serializeToLatex(doc);
            expect(result).toContain('\\caption{My Table}');
            expect(result).toContain('\\label{tab:mytable}');
            expect(result).toContain('\\centering');
        });

        it('should serialize standalone tabular without table wrapper', () => {
            const latex = `\\begin{tabular}{|c|c|}
        \\hline
        A & B \\\\
        \\hline
\\end{tabular}`;
            const doc = parseLatex(latex);
            const result = serializeToLatex(doc);
            expect(result).toContain('\\begin{tabular}{|c|c|}');
            expect(result).toContain('\\end{tabular}');
            expect(result).not.toContain('\\begin{table}');
            expect(result).not.toContain('\\end{table}');
        });
    });
});

describe('round-trip', () => {
    const roundTrip = (latex: string): string => {
        const doc = parseLatex(latex);
        return serializeToLatex(doc);
    };

    it('should round-trip plain text', () => {
        expect(roundTrip('Hello world').trim()).toBe('Hello world');
    });

    it('should round-trip sections', () => {
        const result = roundTrip('\\section{Intro}');
        expect(result).toContain('\\section{Intro}');
    });

    it('should round-trip bold text in paragraph', () => {
        const result = roundTrip('This is \\textbf{important} text');
        expect(result).toContain('\\textbf{important}');
        expect(result).toContain('This is');
        expect(result).toContain('text');
    });

    it('should round-trip inline math', () => {
        const result = roundTrip('Formula: $a+b=c$');
        expect(result).toContain('$a+b=c$');
    });

    it('should round-trip display math', () => {
        const result = roundTrip('$$\\int_0^1 x dx$$');
        expect(result).toContain('$$\\int_0^1 x dx$$');
    });

    it('should round-trip lists', () => {
        const input = '\\begin{itemize}\n\\item Alpha\n\\item Beta\n\\end{itemize}';
        const result = roundTrip(input);
        expect(result).toContain('\\begin{itemize}');
        expect(result).toContain('\\end{itemize}');
        expect(result).toContain('Alpha');
        expect(result).toContain('Beta');
    });

    it('should round-trip list items without adding extra spaces', () => {
        const input = '\\begin{itemize}\n    \\item A\n    \\item B\n    \\item C\n\\end{itemize}';
        const result = roundTrip(input);
        // Each item line should have exactly one space between \item and content
        expect(result).toContain('\\item A\n');
        expect(result).toContain('\\item B\n');
        expect(result).toContain('\\item C\n');
        // Should NOT have double spaces
        expect(result).not.toContain('\\item  A');
        expect(result).not.toContain('\\item  B');
        expect(result).not.toContain('\\item  C');
    });

    it('should preserve raw block content', () => {
        const result = roundTrip('\\documentclass[12pt]{article}');
        expect(result).toContain('\\documentclass[12pt]{article}');
    });

    it('should round-trip a multi-element document', () => {
        const input = `\\section{Title}

First paragraph with \\textbf{bold}.

\\begin{itemize}
\\item Item one
\\item Item two
\\end{itemize}

Second paragraph.`;
        const result = roundTrip(input);
        expect(result).toContain('\\section{Title}');
        expect(result).toContain('\\textbf{bold}');
        expect(result).toContain('\\begin{itemize}');
        expect(result).toContain('Second paragraph');
    });

    it('should preserve content after tables', () => {
        const input = `\\begin{table}[h]
\\centering
\\begin{tabular}{|c|c|}
\\hline
A & B \\\\
\\hline
\\end{tabular}
\\end{table}

After table text.`;
        const result = roundTrip(input);
        expect(result).toContain('After table text');
    });

    it('should round-trip table caption and label', () => {
        const input = `\\begin{table}[h]
\\centering
\\caption{Results}
\\label{tab:results}
\\begin{tabular}{|c|c|c|}
\\hline
X & Y & Z \\\\
\\hline
1 & 2 & 3 \\\\
\\hline
\\end{tabular}
\\end{table}`;
        const result = roundTrip(input);
        expect(result).toContain('\\caption{Results}');
        expect(result).toContain('\\label{tab:results}');
        expect(result).toContain('\\centering');
        expect(result).toContain('\\begin{table}[h]');
        expect(result).toContain('\\begin{tabular}{|c|c|c|}');
        expect(result).toContain('X & Y & Z');
        expect(result).toContain('1 & 2 & 3');
    });

    it('should round-trip table with caption after tabular', () => {
        const input = `\\begin{table}[ht]
\\centering
\\begin{tabular}{cc}
\\hline
A & B \\\\
\\hline
\\end{tabular}
\\caption{After}
\\label{tab:after}
\\end{table}`;
        const result = roundTrip(input);
        expect(result).toContain('\\caption{After}');
        expect(result).toContain('\\label{tab:after}');
        expect(result).toContain('\\begin{table}[ht]');
    });

    it('should round-trip table cell formatting', () => {
        const input = `\\begin{tabular}{|c|c|}
\\hline
\\textbf{Bold} & $x^2$ \\\\
\\hline
\\end{tabular}`;
        const result = roundTrip(input);
        expect(result).toContain('\\textbf{Bold}');
        expect(result).toContain('$x^2$');
    });

    it('should round-trip \\begin{document} and \\end{document}', () => {
        const input = `\\documentclass{article}
\\usepackage{amsmath}

\\begin{document}

\\section{Introduction}

Some content here.

\\end{document}`;
        const result = roundTrip(input);
        expect(result).toContain('\\begin{document}');
        expect(result).toContain('\\end{document}');
        expect(result).toContain('\\documentclass{article}');
        expect(result).toContain('\\section{Introduction}');
    });
});
