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

                // Parse version reference from filePath
                const fullPath = node.attrs.filePath || 'file.tex';
                let displayPath = fullPath;
                let refBadge: HTMLSpanElement | null = null;

                const branchMatch = fullPath.match(/^(.+)@([^#]+)$/);
                const commitMatch = fullPath.match(/^(.+)#(.+)$/);

                if (branchMatch) {
                    displayPath = branchMatch[1];
                    refBadge = document.createElement('span');
                    refBadge.className = 'latex-input-ref-badge latex-input-ref-branch';
                    refBadge.textContent = '@' + branchMatch[2];
                } else if (commitMatch) {
                    displayPath = commitMatch[1];
                    refBadge = document.createElement('span');
                    refBadge.className = 'latex-input-ref-badge latex-input-ref-commit';
                    refBadge.textContent = '#' + commitMatch[2];
                }

                const path = document.createElement('span');
                path.className = 'latex-input-path';
                path.textContent = displayPath;
                inner.appendChild(path);

                if (refBadge) {
                    inner.appendChild(refBadge);
                }

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
