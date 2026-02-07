import {Node, mergeAttributes} from '@tiptap/core';

export const LatexMathInline = Node.create({
    name: 'latexMathInline',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            latex: {default: ''},
            rawLatex: {default: null},
        };
    },

    parseHTML() {
        return [{tag: 'span[data-latex-math-inline]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {
            'data-latex-math-inline': '',
            class: 'latex-math-inline',
        }), 0];
    },

    addNodeView() {
        return ({node, getPos, editor}) => {
            const dom = document.createElement('span');
            dom.className = 'latex-math-inline';
            dom.setAttribute('data-latex-math-inline', '');
            dom.contentEditable = 'false';

            const renderMath = () => {
                const latex = node.attrs.latex;
                try {
                    // Dynamic import KaTeX
                    import('katex').then(katex => {
                        katex.default.render(latex, dom, {
                            throwOnError: false,
                            displayMode: false,
                        });
                    });
                } catch {
                    dom.textContent = `$${latex}$`;
                }
            };

            renderMath();

            dom.addEventListener('click', () => {
                // Dispatch a custom event for the MathPopup to listen to
                const event = new CustomEvent('latex-math-click', {
                    bubbles: true,
                    detail: {
                        latex: node.attrs.latex,
                        pos: typeof getPos === 'function' ? getPos() : 0,
                        isBlock: false,
                    },
                });
                dom.dispatchEvent(event);
            });

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'latexMathInline') return false;
                    node = updatedNode;
                    renderMath();
                    return true;
                },
            };
        };
    },
});
