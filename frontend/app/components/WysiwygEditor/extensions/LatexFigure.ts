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

    addStorage() {
        return {
            resolveImageUrl: null as ((imagePath: string) => string | null) | null,
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
        return ({node, getPos, editor}) => {
            const dom = document.createElement('div');
            dom.className = 'latex-figure';
            dom.setAttribute('data-latex-figure', '');
            dom.contentEditable = 'false';

            dom.addEventListener('click', () => {
                const pos = typeof getPos === 'function' ? getPos() : null;
                if (pos == null) return;
                dom.dispatchEvent(new CustomEvent('latex-figure-click', {
                    bubbles: true,
                    detail: {
                        imagePath: node.attrs.imagePath,
                        caption: node.attrs.caption,
                        pos,
                    },
                }));
            });

            const render = () => {
                dom.innerHTML = '';

                const resolveImageUrl = (editor.storage as any).latexFigure?.resolveImageUrl;
                const imageUrl = resolveImageUrl ? resolveImageUrl(node.attrs.imagePath) : null;

                if (imageUrl) {
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = node.attrs.caption || node.attrs.imagePath || 'figure';
                    img.className = 'latex-figure-img';
                    dom.appendChild(img);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'latex-figure-placeholder';

                    const icon = document.createElement('span');
                    icon.className = 'latex-figure-icon';
                    icon.textContent = '\u{1F5BC}';
                    placeholder.appendChild(icon);

                    const path = document.createElement('span');
                    path.className = 'latex-figure-path';
                    path.textContent = node.attrs.imagePath || 'image';
                    placeholder.appendChild(path);

                    dom.appendChild(placeholder);
                }

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
