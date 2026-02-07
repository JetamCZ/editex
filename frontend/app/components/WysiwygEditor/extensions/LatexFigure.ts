import {Node, mergeAttributes} from '@tiptap/core';

export const LatexFigure = Node.create({
    name: 'latexFigure',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            caption: {default: ''},
            imagePath: {default: ''},
            rawLatex: {default: null},
        };
    },

    parseHTML() {
        return [{tag: 'div[data-latex-figure]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['div', mergeAttributes(HTMLAttributes, {
            'data-latex-figure': '',
            class: 'latex-figure',
        }), 0];
    },

    addNodeView() {
        return ({node}) => {
            const dom = document.createElement('div');
            dom.className = 'latex-figure';
            dom.setAttribute('data-latex-figure', '');
            dom.contentEditable = 'false';

            const render = () => {
                dom.innerHTML = '';
                const placeholder = document.createElement('div');
                placeholder.className = 'latex-figure-placeholder';

                const icon = document.createElement('span');
                icon.className = 'latex-figure-icon';
                icon.textContent = '\u{1F5BC}'; // image icon
                placeholder.appendChild(icon);

                const path = document.createElement('span');
                path.className = 'latex-figure-path';
                path.textContent = node.attrs.imagePath || 'image';
                placeholder.appendChild(path);

                dom.appendChild(placeholder);

                if (node.attrs.caption) {
                    const caption = document.createElement('div');
                    caption.className = 'latex-figure-caption';
                    caption.textContent = node.attrs.caption;
                    dom.appendChild(caption);
                }
            };

            render();

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'latexFigure') return false;
                    node = updatedNode;
                    render();
                    return true;
                },
            };
        };
    },
});
