import {Node, mergeAttributes} from '@tiptap/core';

/**
 * Hidden preamble node for commands like \documentclass, \usepackage,
 * \begin{document}, \end{document}. These are preserved for round-tripping
 * but not rendered visually in the editor.
 */
export const LatexPreamble = Node.create({
    name: 'latexPreamble',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            content: {default: ''},
            rawLatex: {default: null},
        };
    },

    parseHTML() {
        return [{tag: 'div[data-latex-preamble]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['div', mergeAttributes(HTMLAttributes, {
            'data-latex-preamble': '',
            class: 'latex-preamble',
        }), 0];
    },

    addNodeView() {
        return ({node}) => {
            const dom = document.createElement('div');
            dom.className = 'latex-preamble';
            dom.setAttribute('data-latex-preamble', '');
            dom.contentEditable = 'false';
            // Hidden — zero height, no display
            dom.style.display = 'none';

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'latexPreamble') return false;
                    node = updatedNode;
                    return true;
                },
            };
        };
    },
});
