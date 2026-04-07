import {Node, mergeAttributes} from '@tiptap/core';

export const LatexComment = Node.create({
    name: 'latexComment',
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
        return [{tag: 'span[data-latex-comment]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {
            'data-latex-comment': '',
            class: 'latex-comment',
        }), 0];
    },

    addNodeView() {
        return ({node}) => {
            const dom = document.createElement('span');
            dom.className = 'latex-comment';
            dom.setAttribute('data-latex-comment', '');
            dom.contentEditable = 'false';

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'latexComment') return false;
                    return true;
                },
            };
        };
    },
});
