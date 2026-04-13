import type {TipTapNode, TipTapMark} from '../latex-parser/types';

interface SerializerState {
    output: string;
}

export function serializeDoc(doc: {type: string; content?: TipTapNode[]}): string {
    const state: SerializerState = {output: ''};

    if (!doc.content) return '';

    for (let i = 0; i < doc.content.length; i++) {
        const node = doc.content[i];
        serializeNode(node, state);

        // Add blank line between block-level nodes (paragraph separation)
        if (i < doc.content.length - 1) {
            const next = doc.content[i + 1];
            // Don't double-space if current node already ends with newlines
            if (!state.output.endsWith('\n\n')) {
                state.output += '\n\n';
            }
        }
    }

    let result = state.output.replace(/\n{3,}/g, '\n\n');
    // Only ensure the output ends with a single newline.
    // Don't use trimEnd() — it strips trailing \n\n that represents
    // empty paragraphs at the end of the document (e.g. user pressed Enter).
    if (!result.endsWith('\n')) {
        result += '\n';
    }
    return result;
}

function serializeNode(node: TipTapNode, state: SerializerState): void {
    switch (node.type) {
        case 'paragraph':
            serializeParagraph(node, state);
            break;
        case 'heading':
            serializeHeading(node, state);
            break;
        case 'bulletList':
            serializeList(node, 'itemize', state);
            break;
        case 'orderedList':
            serializeList(node, 'enumerate', state);
            break;
        case 'latexMathBlock':
            serializeMathBlock(node, state);
            break;
        case 'latexMathInline':
            serializeMathInline(node, state);
            break;
        case 'latexFigure':
            serializeFigure(node, state);
            break;
        case 'latexRawBlock':
            serializeRawBlock(node, state);
            break;
        case 'latexRawInline':
            serializeRawInline(node, state);
            break;
        case 'latexHref':
            serializeHref(node, state);
            break;
        case 'latexTitle':
            serializeTitle(node, state);
            break;
        case 'latexComment':
            serializeComment(node, state);
            break;
        case 'latexInput':
            serializeInput(node, state);
            break;
        case 'latexPreamble':
            serializePreamble(node, state);
            break;
        case 'table':
            serializeTable(node, state);
            break;
        case 'text':
            serializeText(node, state);
            break;
        default:
            // Unknown node: try to serialize children
            if (node.content) {
                for (const child of node.content) {
                    serializeNode(child, state);
                }
            }
            break;
    }
}

function serializeParagraph(node: TipTapNode, state: SerializerState): void {
    if (!node.content) return;
    for (const child of node.content) {
        serializeInline(child, state);
    }
}

function serializeHeading(node: TipTapNode, state: SerializerState): void {
    const level = (node.attrs?.level as number) || 1;
    const commands: Record<number, string> = {
        1: '\\section',
        2: '\\subsection',
        3: '\\subsubsection',
    };
    const cmd = commands[level] || '\\section';
    state.output += `${cmd}{`;
    if (node.content) {
        for (const child of node.content) {
            serializeInline(child, state);
        }
    }
    state.output += '}';
}

function serializeList(node: TipTapNode, envName: string, state: SerializerState): void {
    state.output += `\\begin{${envName}}\n`;
    if (node.content) {
        for (const item of node.content) {
            if (item.type === 'listItem') {
                state.output += '    \\item ';
                if (item.content) {
                    for (const child of item.content) {
                        if (child.type === 'paragraph') {
                            serializeParagraph(child, state);
                        } else if (child.type === 'bulletList' || child.type === 'orderedList') {
                            state.output += '\n';
                            const nestedEnv = child.type === 'orderedList' ? 'enumerate' : 'itemize';
                            serializeList(child, nestedEnv, state);
                        } else {
                            serializeNode(child, state);
                        }
                    }
                }
                state.output += '\n';
            }
        }
    }
    state.output += `\\end{${envName}}`;
}

function serializeMathBlock(node: TipTapNode, state: SerializerState): void {
    const rawLatex = node.attrs?.rawLatex as string | undefined;
    if (rawLatex) {
        state.output += rawLatex;
    } else {
        const latex = node.attrs?.latex as string || '';
        state.output += `$$${latex}$$`;
    }
}

function serializeMathInline(node: TipTapNode, state: SerializerState): void {
    const rawLatex = node.attrs?.rawLatex as string | undefined;
    if (rawLatex) {
        state.output += rawLatex;
    } else {
        const latex = node.attrs?.latex as string || '';
        state.output += `$${latex}$`;
    }
}

function serializeFigure(node: TipTapNode, state: SerializerState): void {
    const rawLatex = node.attrs?.rawLatex as string | undefined;
    if (rawLatex) {
        state.output += rawLatex;
    } else {
        const caption = node.attrs?.caption as string || 'Caption';
        const imagePath = node.attrs?.imagePath as string || 'image.png';
        state.output += `\\begin{figure}[h]\n    \\centering\n    \\includegraphics[width=0.5\\textwidth]{${imagePath}}\n    \\caption{${caption}}\n\\end{figure}`;
    }
}

function serializeRawBlock(node: TipTapNode, state: SerializerState): void {
    const rawLatex = node.attrs?.rawLatex as string | undefined;
    if (rawLatex) {
        state.output += rawLatex;
    } else {
        state.output += node.attrs?.content as string || '';
    }
}

function serializeRawInline(node: TipTapNode, state: SerializerState): void {
    const rawLatex = node.attrs?.rawLatex as string | undefined;
    if (rawLatex) {
        state.output += rawLatex;
    } else {
        state.output += node.attrs?.content as string || '';
    }
}

function serializeTable(node: TipTapNode, state: SerializerState): void {
    if (!node.content) return;

    const colSpec = node.attrs?.colSpec as string || '';
    const placement = node.attrs?.placement as string || '';
    const rawBeforeTabular = node.attrs?.rawBeforeTabular as string || '';
    const rawAfterTabular = node.attrs?.rawAfterTabular as string || '';
    const isTableEnv = node.attrs?.isTableEnv as boolean ?? true;

    const numCols = node.content[0]?.content?.length || 2;
    const effectiveColSpec = colSpec || `|${Array(numCols).fill('c').join('|')}|`;

    if (isTableEnv) {
        state.output += `\\begin{table}`;
        if (placement) state.output += `[${placement}]`;
        state.output += '\n';
        if (rawBeforeTabular) {
            const lines = rawBeforeTabular.split('\n');
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    state.output += `    ${trimmedLine}\n`;
                }
            }
        } else {
            state.output += '    \\centering\n';
        }
    }

    const indent = isTableEnv ? '    ' : '';
    const cellIndent = isTableEnv ? '        ' : '    ';

    state.output += `${indent}\\begin{tabular}{${effectiveColSpec}}\n`;
    state.output += `${cellIndent}\\hline\n`;

    for (const row of node.content) {
        if (row.type === 'tableRow' && row.content) {
            const cells = row.content.map(cell => {
                if (cell.content) {
                    const innerState: SerializerState = {output: ''};
                    for (const p of cell.content) {
                        if (p.type === 'paragraph') {
                            serializeParagraph(p, innerState);
                        }
                    }
                    return innerState.output.trim();
                }
                return '';
            });
            state.output += `${cellIndent}${cells.join(' & ')} \\\\\n${cellIndent}\\hline\n`;
        }
    }

    state.output += `${indent}\\end{tabular}`;

    if (isTableEnv) {
        state.output += '\n';
        if (rawAfterTabular) {
            const lines = rawAfterTabular.split('\n');
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    state.output += `    ${trimmedLine}\n`;
                }
            }
        }
        state.output += `\\end{table}`;
    }
}

function serializeInput(node: TipTapNode, state: SerializerState): void {
    const rawLatex = node.attrs?.rawLatex as string | undefined;
    if (rawLatex) {
        state.output += rawLatex;
    } else {
        const filePath = node.attrs?.filePath as string || '';
        state.output += `\\input{${filePath}}`;
    }
}

function serializePreamble(node: TipTapNode, state: SerializerState): void {
    const rawLatex = node.attrs?.rawLatex as string | undefined;
    if (rawLatex) {
        state.output += rawLatex;
    } else {
        state.output += node.attrs?.content as string || '';
    }
}

function serializeTitle(node: TipTapNode, state: SerializerState): void {
    const rawLatex = node.attrs?.rawLatex as string | undefined;
    if (rawLatex) {
        state.output += rawLatex;
    } else {
        const kind = node.attrs?.kind as string || 'title';
        const text = node.attrs?.text as string || '';
        state.output += `\\${kind}{${text}}`;
    }
}

function serializeHref(node: TipTapNode, state: SerializerState): void {
    const rawLatex = node.attrs?.rawLatex as string | undefined;
    if (rawLatex) {
        state.output += rawLatex;
    } else {
        const url = node.attrs?.url as string || '';
        const text = node.attrs?.text as string || '';
        const isUrl = node.attrs?.isUrl as boolean || false;
        if (isUrl) {
            state.output += `\\url{${url}}`;
        } else {
            state.output += `\\href{${url}}{${text}}`;
        }
    }
}

function serializeComment(node: TipTapNode, state: SerializerState): void {
    const rawLatex = node.attrs?.rawLatex as string | undefined;
    if (rawLatex) {
        state.output += rawLatex;
    } else {
        state.output += node.attrs?.content as string || '';
    }
}

function serializeInline(node: TipTapNode, state: SerializerState): void {
    if (node.type === 'text') {
        serializeText(node, state);
    } else if (node.type === 'latexMathInline') {
        serializeMathInline(node, state);
    } else if (node.type === 'latexRawInline') {
        serializeRawInline(node, state);
    } else if (node.type === 'latexHref') {
        serializeHref(node, state);
    } else if (node.type === 'latexComment') {
        serializeComment(node, state);
    } else if (node.type === 'hardBreak') {
        state.output += '\n';
    } else {
        serializeNode(node, state);
    }
}

function serializeText(node: TipTapNode, state: SerializerState): void {
    let text = node.text || '';
    const marks = node.marks || [];

    // Sort marks so nesting is consistent: bold outside, italic inside, underline innermost
    const sortOrder: Record<string, number> = {bold: 0, italic: 1, underline: 2};
    const sorted = [...marks]
        .filter(m => m.type in sortOrder)
        .sort((a, b) => (sortOrder[a.type] || 99) - (sortOrder[b.type] || 99));

    // Handle code mark specially (for comments)
    const hasCode = marks.some(m => m.type === 'code');
    if (hasCode) {
        state.output += text;
        return;
    }

    // Wrap in LaTeX commands from outermost to innermost
    let prefix = '';
    let suffix = '';
    for (const mark of sorted) {
        const cmd = markToCommand(mark);
        if (cmd) {
            prefix += `${cmd}{`;
            suffix = '}' + suffix;
        }
    }

    state.output += prefix + text + suffix;
}

function markToCommand(mark: TipTapMark): string | null {
    switch (mark.type) {
        case 'bold': return '\\textbf';
        case 'italic': return '\\textit';
        case 'underline': return '\\underline';
        default: return null;
    }
}
