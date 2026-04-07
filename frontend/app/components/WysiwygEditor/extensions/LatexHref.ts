import {Node, mergeAttributes} from '@tiptap/core';

export const LatexHref = Node.create({
    name: 'latexHref',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            url: {default: ''},
            text: {default: ''},
            rawLatex: {default: null},
            isUrl: {default: false},
        };
    },

    parseHTML() {
        return [{tag: 'a[data-latex-href]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['a', mergeAttributes(HTMLAttributes, {
            'data-latex-href': '',
            class: 'latex-href',
            href: HTMLAttributes.url || '#',
            target: '_blank',
            rel: 'noopener noreferrer',
        }), HTMLAttributes.text || HTMLAttributes.url || ''];
    },

    addNodeView() {
        return ({node, getPos}) => {
            const dom = document.createElement('a');
            dom.className = 'latex-href';
            dom.setAttribute('data-latex-href', '');
            dom.contentEditable = 'false';
            dom.href = node.attrs.url || '#';
            dom.target = '_blank';
            dom.rel = 'noopener noreferrer';
            dom.textContent = node.attrs.text || node.attrs.url || '';
            dom.title = node.attrs.url || '';

            dom.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const pos = typeof getPos === 'function' ? getPos() : 0;
                dom.dispatchEvent(new CustomEvent('latex-href-click', {
                    bubbles: true,
                    detail: {
                        url: node.attrs.url,
                        text: node.attrs.text,
                        isUrl: node.attrs.isUrl,
                        pos,
                    },
                }));
            });

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'latexHref') return false;
                    node = updatedNode;
                    dom.href = updatedNode.attrs.url || '#';
                    dom.textContent = updatedNode.attrs.text || updatedNode.attrs.url || '';
                    dom.title = updatedNode.attrs.url || '';
                    return true;
                },
            };
        };
    },
});
