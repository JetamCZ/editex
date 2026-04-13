import {useEditor, EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {Table} from '@tiptap/extension-table';
import {TableRow} from '@tiptap/extension-table-row';
import {TableCell} from '@tiptap/extension-table-cell';
import {TableHeader} from '@tiptap/extension-table-header';
import {Placeholder} from '@tiptap/extension-placeholder';
import {useEffect, useState, useCallback, useRef, useMemo} from 'react';
import WysiwygToolbar from './WysiwygToolbar';
import MathPopup from './MathPopup';
import ImagePopup from './ImagePopup';
import InputFilePopup from './InputFilePopup';
import HrefPopup from './HrefPopup';
import {useProjectFiles} from '~/hooks/useProjectFiles';
import {getFileContentType, ContentType} from '~/const/ContentType';
import type {ProjectFile} from '../../../types/file';
import {
    LatexMathInline,
    LatexMathBlock,
    LatexFigure,
    LatexRawInline,
    LatexRawBlock,
    LatexInput,
    LatexPreamble,
    LatexHref,
    LatexComment,
    LatexTitle,
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
    /** Base project identifier for fetching uploaded files */
    baseProject?: string;
    /** Branch name for fetching uploaded files */
    branch?: string;
}

export default function WysiwygEditor({content, onContentChange, visible, baseProject, branch}: WysiwygEditorProps) {
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

    const [inputFilePopup, setInputFilePopup] = useState<{
        filePath: string;
        pos: number;
    } | null>(null);

    const [hrefPopup, setHrefPopup] = useState<{
        url: string;
        text: string;
        pos: number;
        isNew?: boolean;
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
            LatexInput,
            LatexPreamble,
            LatexHref,
            LatexComment,
            LatexTitle,
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

    // Fetch project files for image resolution
    const {data: projectFiles = []} = useProjectFiles({
        baseProject: baseProject || '',
        branch,
        enabled: !!baseProject,
    });

    const imageFiles = useMemo(() => {
        return projectFiles.filter((f: ProjectFile) =>
            getFileContentType(f.fileType, f.originalFileName) === ContentType.IMAGE
        );
    }, [projectFiles]);

    // Set image resolver on the editor storage so figure nodes can show previews
    useEffect(() => {
        if (!editor) return;

        const resolveImageUrl = (imagePath: string): string | null => {
            if (!imagePath) return null;
            // Try to match by relative path (folder/filename) or just filename
            const normalizedPath = imagePath.replace(/^\.\//, '');
            for (const file of imageFiles) {
                const folder = file.projectFolder?.replace(/^\/+/, '') || '';
                const relativePath = folder ? `${folder}/${file.originalFileName}` : file.originalFileName;
                if (relativePath === normalizedPath || file.originalFileName === normalizedPath) {
                    return file.s3Url;
                }
            }
            return null;
        };

        (editor.storage as any).latexFigure.resolveImageUrl = resolveImageUrl;

        // Force re-render of all figure nodes so they pick up the resolver
        editor.view.dispatch(editor.state.tr.setMeta('resolveImageUrl', true));
    }, [editor, imageFiles]);

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

        const handleInputClick = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail) {
                setInputFilePopup({
                    filePath: detail.filePath || '',
                    pos: detail.pos,
                });
            }
        };

        const handleHrefClick = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail) {
                setHrefPopup({
                    url: detail.url || '',
                    text: detail.text || '',
                    pos: detail.pos,
                });
            }
        };

        const editorElement = editor.view.dom;
        editorElement.addEventListener('latex-math-click', handleMathClick);
        editorElement.addEventListener('latex-figure-click', handleFigureClick);
        editorElement.addEventListener('latex-input-click', handleInputClick);
        editorElement.addEventListener('latex-href-click', handleHrefClick);
        return () => {
            editorElement.removeEventListener('latex-math-click', handleMathClick);
            editorElement.removeEventListener('latex-figure-click', handleFigureClick);
            editorElement.removeEventListener('latex-input-click', handleInputClick);
            editorElement.removeEventListener('latex-href-click', handleHrefClick);
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

    const handleInputSave = useCallback((filePath: string) => {
        if (!editor || !inputFilePopup) return;

        const pos = inputFilePopup.pos;
        const tr = editor.state.tr;
        const node = tr.doc.nodeAt(pos);
        if (node && node.type.name === 'latexInput') {
            tr.setNodeMarkup(pos, undefined, {
                filePath,
                rawLatex: null,
            });
            editor.view.dispatch(tr);
        }

        setInputFilePopup(null);
    }, [editor, inputFilePopup]);

    const handleHrefSave = useCallback((url: string, text: string) => {
        if (!editor || !hrefPopup) return;

        if (hrefPopup.isNew) {
            editor.chain().focus().insertContent({
                type: 'latexHref',
                attrs: {url, text, rawLatex: null, isUrl: false},
            }).run();
        } else {
            const pos = hrefPopup.pos;
            const tr = editor.state.tr;
            const node = tr.doc.nodeAt(pos);
            if (node && node.type.name === 'latexHref') {
                tr.setNodeMarkup(pos, undefined, {
                    url,
                    text,
                    rawLatex: null,
                    isUrl: false,
                });
                editor.view.dispatch(tr);
            }
        }

        setHrefPopup(null);
    }, [editor, hrefPopup]);

    if (!visible) return null;

    return (
        <div className="wysiwyg-editor">
            <WysiwygToolbar editor={editor} onInsertLink={() => setHrefPopup({url: '', text: '', pos: 0, isNew: true})} />
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
                    baseProject={baseProject}
                    branch={branch}
                />
            )}
            {inputFilePopup && (
                <InputFilePopup
                    filePath={inputFilePopup.filePath}
                    onSave={handleInputSave}
                    onCancel={() => setInputFilePopup(null)}
                    baseProject={baseProject}
                    branch={branch}
                />
            )}
            {hrefPopup && (
                <HrefPopup
                    url={hrefPopup.url}
                    text={hrefPopup.text}
                    onSave={handleHrefSave}
                    onCancel={() => setHrefPopup(null)}
                />
            )}
        </div>
    );
}
