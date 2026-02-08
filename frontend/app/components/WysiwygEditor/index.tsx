import {useEditor, EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {Table} from '@tiptap/extension-table';
import {TableRow} from '@tiptap/extension-table-row';
import {TableCell} from '@tiptap/extension-table-cell';
import {TableHeader} from '@tiptap/extension-table-header';
import {Placeholder} from '@tiptap/extension-placeholder';
import {useEffect, useState, useCallback, useRef} from 'react';
import WysiwygToolbar from './WysiwygToolbar';
import MathPopup from './MathPopup';
import ImagePopup from './ImagePopup';
import {
    LatexMathInline,
    LatexMathBlock,
    LatexFigure,
    LatexRawInline,
    LatexRawBlock,
} from './extensions';
import {parseLatex} from './latex-parser';
import {serializeToLatex} from './latex-serializer';
import type {TipTapDoc} from './latex-parser/types';
import './styles/wysiwyg.css';
import 'katex/dist/katex.min.css';

interface WysiwygEditorProps {
    /** Current LaTeX content from Monaco */
    content: string;
    /** Called when WYSIWYG edits should be pushed to Monaco */
    onContentChange: (latex: string) => void;
    /** Whether this panel is currently visible */
    visible: boolean;
}

export default function WysiwygEditor({content, onContentChange, visible}: WysiwygEditorProps) {
    const [mathPopup, setMathPopup] = useState<{
        latex: string;
        pos: number;
        isBlock: boolean;
    } | null>(null);

    const [imagePopup, setImagePopup] = useState<{
        imagePath: string;
        caption: string;
        pos: number;
    } | null>(null);

    const syncDirectionRef = useRef<'none' | 'monaco-to-tiptap' | 'tiptap-to-monaco'>('none');
    const lastMonacoContentRef = useRef<string>(content);
    const tiptapToMonacoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const monacoToTiptapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Disable built-in code block to avoid conflict with raw blocks
                codeBlock: false,
            }),
            Underline,
            Table.extend({
                addAttributes() {
                    return {
                        ...(this.parent?.() || {}),
                        colSpec: {default: ''},
                        placement: {default: ''},
                        rawBeforeTabular: {default: ''},
                        rawAfterTabular: {default: ''},
                        isTableEnv: {default: true},
                    };
                },
            }).configure({resizable: true}),
            TableRow,
            TableCell,
            TableHeader,
            Placeholder.configure({placeholder: 'Start writing...'}),
            LatexMathInline,
            LatexMathBlock,
            LatexFigure,
            LatexRawInline,
            LatexRawBlock,
        ],
        editorProps: {
            attributes: {
                class: 'tiptap',
            },
        },
        onUpdate({editor}) {
            // TipTap -> Monaco sync
            if (syncDirectionRef.current === 'monaco-to-tiptap') return;

            if (tiptapToMonacoTimerRef.current) {
                clearTimeout(tiptapToMonacoTimerRef.current);
            }

            tiptapToMonacoTimerRef.current = setTimeout(() => {
                syncDirectionRef.current = 'tiptap-to-monaco';
                try {
                    const doc = editor.getJSON() as TipTapDoc;
                    const latex = serializeToLatex(doc);

                    if (latex !== lastMonacoContentRef.current) {
                        lastMonacoContentRef.current = latex;
                        onContentChange(latex);
                    }
                } finally {
                    // Reset guard after microtask
                    queueMicrotask(() => {
                        syncDirectionRef.current = 'none';
                    });
                }
            }, 150);
        },
    });

    // Listen for math click events
    useEffect(() => {
        if (!editor) return;

        const handleMathClick = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail) {
                setMathPopup({
                    latex: detail.latex,
                    pos: detail.pos,
                    isBlock: detail.isBlock,
                });
            }
        };

        const handleFigureClick = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail) {
                setImagePopup({
                    imagePath: detail.imagePath || '',
                    caption: detail.caption || '',
                    pos: detail.pos,
                });
            }
        };

        const editorElement = editor.view.dom;
        editorElement.addEventListener('latex-math-click', handleMathClick);
        editorElement.addEventListener('latex-figure-click', handleFigureClick);
        return () => {
            editorElement.removeEventListener('latex-math-click', handleMathClick);
            editorElement.removeEventListener('latex-figure-click', handleFigureClick);
        };
    }, [editor]);

    // Monaco -> TipTap sync (debounced)
    useEffect(() => {
        if (!editor || !visible) return;
        if (syncDirectionRef.current === 'tiptap-to-monaco') return;

        if (monacoToTiptapTimerRef.current) {
            clearTimeout(monacoToTiptapTimerRef.current);
        }

        monacoToTiptapTimerRef.current = setTimeout(() => {
            if (syncDirectionRef.current === 'tiptap-to-monaco') return;

            // Compare with last known content to avoid unnecessary updates
            if (content === lastMonacoContentRef.current) return;
            lastMonacoContentRef.current = content;

            syncDirectionRef.current = 'monaco-to-tiptap';
            try {
                const doc = parseLatex(content);
                editor.commands.setContent(doc);
            } finally {
                queueMicrotask(() => {
                    syncDirectionRef.current = 'none';
                });
            }
        }, 300);

        return () => {
            if (monacoToTiptapTimerRef.current) {
                clearTimeout(monacoToTiptapTimerRef.current);
            }
        };
    }, [content, editor, visible]);

    // Initial content load
    useEffect(() => {
        if (!editor || !content) return;

        // Only set initial content once
        const doc = parseLatex(content);
        lastMonacoContentRef.current = content;
        syncDirectionRef.current = 'monaco-to-tiptap';
        editor.commands.setContent(doc);
        queueMicrotask(() => {
            syncDirectionRef.current = 'none';
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor]);

    const handleMathSave = useCallback((newLatex: string) => {
        if (!editor || !mathPopup) return;

        const nodeType = mathPopup.isBlock ? 'latexMathBlock' : 'latexMathInline';
        const pos = mathPopup.pos;

        // Update the node at the stored position
        const tr = editor.state.tr;
        const node = tr.doc.nodeAt(pos);
        if (node && node.type.name === nodeType) {
            tr.setNodeMarkup(pos, undefined, {
                latex: newLatex,
                rawLatex: null, // Clear rawLatex since content was edited
            });
            editor.view.dispatch(tr);
        }

        setMathPopup(null);
    }, [editor, mathPopup]);

    const handleImageSave = useCallback((imagePath: string, caption: string) => {
        if (!editor || !imagePopup) return;

        const pos = imagePopup.pos;
        const tr = editor.state.tr;
        const node = tr.doc.nodeAt(pos);
        if (node && node.type.name === 'latexFigure') {
            tr.setNodeMarkup(pos, undefined, {
                imagePath,
                caption,
                rawLatex: null,
            });
            editor.view.dispatch(tr);
        }

        setImagePopup(null);
    }, [editor, imagePopup]);

    if (!visible) return null;

    return (
        <div className="wysiwyg-editor">
            <WysiwygToolbar editor={editor} />
            <div className="tiptap-wrapper">
                <EditorContent editor={editor} />
            </div>
            {mathPopup && (
                <MathPopup
                    latex={mathPopup.latex}
                    isBlock={mathPopup.isBlock}
                    onSave={handleMathSave}
                    onCancel={() => setMathPopup(null)}
                />
            )}
            {imagePopup && (
                <ImagePopup
                    imagePath={imagePopup.imagePath}
                    caption={imagePopup.caption}
                    onSave={handleImageSave}
                    onCancel={() => setImagePopup(null)}
                />
            )}
        </div>
    );
}
