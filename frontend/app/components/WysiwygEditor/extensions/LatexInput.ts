import {Node, mergeAttributes} from '@tiptap/core';

export const LatexInput = Node.create({
    name: 'latexInput',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            filePath: {default: ''},
            rawLatex: {default: null},
        };
    },

    parseHTML() {
        return [{tag: 'div[data-latex-input]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['div', mergeAttributes(HTMLAttributes, {
            'data-latex-input': '',
            class: 'latex-input',
        }), 0];
    },

    addNodeView() {
        return ({node, getPos}) => {
            const dom = document.createElement('div');
            dom.className = 'latex-input';
            dom.setAttribute('data-latex-input', '');
            dom.contentEditable = 'false';

            dom.addEventListener('click', () => {
                const pos = typeof getPos === 'function' ? getPos() : null;
                if (pos == null) return;
                dom.dispatchEvent(new CustomEvent('latex-input-click', {
                    bubbles: true,
                    detail: {
                        filePath: node.attrs.filePath,
                        pos,
                    },
                }));
            });

            const render = () => {
                dom.innerHTML = '';

                const inner = document.createElement('div');
                inner.className = 'latex-input-inner';

                const icon = document.createElement('span');
                icon.className = 'latex-input-icon';
                icon.textContent = '\\input';
                inner.appendChild(icon);

                const path = document.createElement('span');
                path.className = 'latex-input-path';
                path.textContent = node.attrs.filePath || 'file.tex';
                inner.appendChild(path);

                dom.appendChild(inner);
            };

            render();

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'latexInput') return false;
                    node = updatedNode;
                    render();
                    return true;
                },
            };
        };
    },
});
