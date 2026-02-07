import {Node, mergeAttributes} from '@tiptap/core';

export const LatexMathBlock = Node.create({
    name: 'latexMathBlock',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            latex: {default: ''},
            rawLatex: {default: null},
        };
    },

    parseHTML() {
        return [{tag: 'div[data-latex-math-block]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['div', mergeAttributes(HTMLAttributes, {
            'data-latex-math-block': '',
            class: 'latex-math-block',
        }), 0];
    },

    addNodeView() {
        return ({node, getPos}) => {
            const dom = document.createElement('div');
            dom.className = 'latex-math-block';
            dom.setAttribute('data-latex-math-block', '');
            dom.contentEditable = 'false';

            const renderMath = () => {
                const latex = node.attrs.latex;
                try {
                    import('katex').then(katex => {
                        katex.default.render(latex, dom, {
                            throwOnError: false,
                            displayMode: true,
                        });
                    });
                } catch {
                    dom.textContent = `$$${latex}$$`;
                }
            };

            renderMath();

            dom.addEventListener('click', () => {
                const event = new CustomEvent('latex-math-click', {
                    bubbles: true,
                    detail: {
                        latex: node.attrs.latex,
                        pos: typeof getPos === 'function' ? getPos() : 0,
                        isBlock: true,
                    },
                });
                dom.dispatchEvent(event);
            });

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'latexMathBlock') return false;
                    node = updatedNode;
                    renderMath();
                    return true;
                },
            };
        };
    },
});
