import {Node, mergeAttributes} from '@tiptap/core';

export const LatexTitle = Node.create({
    name: 'latexTitle',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            text: {default: ''},
            kind: {default: 'title'}, // 'title' | 'author' | 'date'
            rawLatex: {default: null},
        };
    },

    parseHTML() {
        return [{tag: 'div[data-latex-title]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['div', mergeAttributes(HTMLAttributes, {
            'data-latex-title': '',
            class: `latex-title latex-title-${HTMLAttributes.kind || 'title'}`,
        }), HTMLAttributes.text || ''];
    },

    addNodeView() {
        return ({node}) => {
            const dom = document.createElement('div');
            dom.contentEditable = 'false';

            const render = () => {
                const kind = node.attrs.kind || 'title';
                const text = node.attrs.text || '';
                dom.className = `latex-title latex-title-${kind}`;
                dom.setAttribute('data-latex-title', kind);
                dom.textContent = text;
            };

            render();

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'latexTitle') return false;
                    node = updatedNode;
                    render();
                    return true;
                },
            };
        };
    },
});
