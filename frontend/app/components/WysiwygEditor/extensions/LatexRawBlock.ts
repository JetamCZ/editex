import {Node, mergeAttributes} from '@tiptap/core';

export const LatexRawBlock = Node.create({
    name: 'latexRawBlock',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            content: {default: ''},
            rawLatex: {default: null},
        };
    },

    parseHTML() {
        return [{tag: 'div[data-latex-raw-block]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['div', mergeAttributes(HTMLAttributes, {
            'data-latex-raw-block': '',
            class: 'latex-raw-block',
        }), 0];
    },

    addNodeView() {
        return ({node}) => {
            const dom = document.createElement('div');
            dom.className = 'latex-raw-block';
            dom.setAttribute('data-latex-raw-block', '');
            dom.contentEditable = 'false';

            const render = () => {
                const content = node.attrs.content || '';
                dom.textContent = content;
                dom.title = 'Raw LaTeX block';
            };

            render();

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'latexRawBlock') return false;
                    node = updatedNode;
                    render();
                    return true;
                },
            };
        };
    },
});
