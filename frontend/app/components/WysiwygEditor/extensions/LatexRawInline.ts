import {Node, mergeAttributes} from '@tiptap/core';

export const LatexRawInline = Node.create({
    name: 'latexRawInline',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            content: {default: ''},
            rawLatex: {default: null},
        };
    },

    parseHTML() {
        return [{tag: 'span[data-latex-raw-inline]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {
            'data-latex-raw-inline': '',
            class: 'latex-raw-inline',
        }), 0];
    },

    addNodeView() {
        return ({node}) => {
            const dom = document.createElement('span');
            dom.className = 'latex-raw-inline';
            dom.setAttribute('data-latex-raw-inline', '');
            dom.contentEditable = 'false';
            dom.textContent = node.attrs.content || '';
            dom.title = 'Raw LaTeX command';

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'latexRawInline') return false;
                    dom.textContent = updatedNode.attrs.content || '';
                    return true;
                },
            };
        };
    },
});
