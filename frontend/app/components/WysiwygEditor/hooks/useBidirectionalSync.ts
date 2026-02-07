import {useRef, useEffect, useCallback} from 'react';
import type {CollaborativeEditorRef} from '~/components/CollaborationEditor';
import {parseLatex} from '../latex-parser';
import {serializeToLatex} from '../latex-serializer';
import type {TipTapDoc} from '../latex-parser/types';
import type {Editor} from '@tiptap/react';

type SyncDirection = 'none' | 'monaco-to-tiptap' | 'tiptap-to-monaco';

interface UseBidirectionalSyncOptions {
    monacoRef: React.RefObject<CollaborativeEditorRef | null>;
    tiptapEditor: Editor | null;
    visible: boolean;
}

export function useBidirectionalSync({monacoRef, tiptapEditor, visible}: UseBidirectionalSyncOptions) {
    const syncDirectionRef = useRef<SyncDirection>('none');
    const lastContentRef = useRef<string>('');
    const monacoToTiptapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tiptapToMonacoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** Push TipTap content to Monaco */
    const pushToMonaco = useCallback(() => {
        if (!tiptapEditor || !monacoRef.current) return;
        if (syncDirectionRef.current === 'monaco-to-tiptap') return;

        syncDirectionRef.current = 'tiptap-to-monaco';
        try {
            const doc = tiptapEditor.getJSON() as TipTapDoc;
            const latex = serializeToLatex(doc);

            const currentMonaco = monacoRef.current.getContent?.() || '';
            if (latex !== currentMonaco) {
                lastContentRef.current = latex;
                monacoRef.current.replaceContent?.(latex);
            }
        } finally {
            queueMicrotask(() => {
                syncDirectionRef.current = 'none';
            });
        }
    }, [tiptapEditor, monacoRef]);

    /** Pull Monaco content to TipTap */
    const pullFromMonaco = useCallback((monacoContent: string) => {
        if (!tiptapEditor || !visible) return;
        if (syncDirectionRef.current === 'tiptap-to-monaco') return;

        if (monacoContent === lastContentRef.current) return;
        lastContentRef.current = monacoContent;

        syncDirectionRef.current = 'monaco-to-tiptap';
        try {
            const doc = parseLatex(monacoContent);
            tiptapEditor.commands.setContent(doc);
        } finally {
            queueMicrotask(() => {
                syncDirectionRef.current = 'none';
            });
        }
    }, [tiptapEditor, visible]);

    // Subscribe to Monaco content changes
    useEffect(() => {
        if (!monacoRef.current?.onContentChange || !visible) return;

        const unsub = monacoRef.current.onContentChange((content: string) => {
            if (monacoToTiptapTimerRef.current) {
                clearTimeout(monacoToTiptapTimerRef.current);
            }
            monacoToTiptapTimerRef.current = setTimeout(() => {
                pullFromMonaco(content);
            }, 300);
        });

        return () => {
            unsub();
            if (monacoToTiptapTimerRef.current) {
                clearTimeout(monacoToTiptapTimerRef.current);
            }
        };
    }, [monacoRef, visible, pullFromMonaco]);

    // Debounced push from TipTap on update
    const schedulePushToMonaco = useCallback(() => {
        if (tiptapToMonacoTimerRef.current) {
            clearTimeout(tiptapToMonacoTimerRef.current);
        }
        tiptapToMonacoTimerRef.current = setTimeout(pushToMonaco, 150);
    }, [pushToMonaco]);

    // Initial sync when becoming visible
    useEffect(() => {
        if (!visible || !tiptapEditor || !monacoRef.current?.getContent) return;

        const content = monacoRef.current.getContent();
        if (content) {
            lastContentRef.current = content;
            syncDirectionRef.current = 'monaco-to-tiptap';
            const doc = parseLatex(content);
            tiptapEditor.commands.setContent(doc);
            queueMicrotask(() => {
                syncDirectionRef.current = 'none';
            });
        }
    }, [visible, tiptapEditor, monacoRef]);

    return {
        schedulePushToMonaco,
        syncDirectionRef,
    };
}
