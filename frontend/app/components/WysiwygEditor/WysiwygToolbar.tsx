import type {Editor} from '@tiptap/react';
import {Tooltip, IconButton} from '@radix-ui/themes';
import {
    FontBoldIcon,
    FontItalicIcon,
    UnderlineIcon,
    ListBulletIcon,
    HeadingIcon,
    TableIcon,
    PlusIcon,
    MinusIcon,
    TrashIcon,
} from '@radix-ui/react-icons';

interface Props {
    editor: Editor | null;
}

export default function WysiwygToolbar({editor}: Props) {
    if (!editor) return null;

    const isInTable = editor.isActive('table');

    return (
        <div className="wysiwyg-toolbar">
            <Tooltip content="Bold">
                <IconButton
                    size="1"
                    variant={editor.isActive('bold') ? 'solid' : 'ghost'}
                    color="gray"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <FontBoldIcon width="16" height="16" />
                </IconButton>
            </Tooltip>

            <Tooltip content="Italic">
                <IconButton
                    size="1"
                    variant={editor.isActive('italic') ? 'solid' : 'ghost'}
                    color="gray"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <FontItalicIcon width="16" height="16" />
                </IconButton>
            </Tooltip>

            <Tooltip content="Underline">
                <IconButton
                    size="1"
                    variant={editor.isActive('underline') ? 'solid' : 'ghost'}
                    color="gray"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    <UnderlineIcon width="16" height="16" />
                </IconButton>
            </Tooltip>

            <div className="wysiwyg-toolbar-separator" />

            <Tooltip content="Heading 1">
                <IconButton
                    size="1"
                    variant={editor.isActive('heading', {level: 1}) ? 'solid' : 'ghost'}
                    color="gray"
                    onClick={() => editor.chain().focus().toggleHeading({level: 1}).run()}
                >
                    <HeadingIcon width="16" height="16" />
                </IconButton>
            </Tooltip>

            <Tooltip content="Heading 2">
                <IconButton
                    size="1"
                    variant={editor.isActive('heading', {level: 2}) ? 'solid' : 'ghost'}
                    color="gray"
                    onClick={() => editor.chain().focus().toggleHeading({level: 2}).run()}
                    style={{fontSize: '12px', fontWeight: 700}}
                >
                    H2
                </IconButton>
            </Tooltip>

            <Tooltip content="Heading 3">
                <IconButton
                    size="1"
                    variant={editor.isActive('heading', {level: 3}) ? 'solid' : 'ghost'}
                    color="gray"
                    onClick={() => editor.chain().focus().toggleHeading({level: 3}).run()}
                    style={{fontSize: '11px', fontWeight: 700}}
                >
                    H3
                </IconButton>
            </Tooltip>

            <div className="wysiwyg-toolbar-separator" />

            <Tooltip content="Bullet List">
                <IconButton
                    size="1"
                    variant={editor.isActive('bulletList') ? 'solid' : 'ghost'}
                    color="gray"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <ListBulletIcon width="16" height="16" />
                </IconButton>
            </Tooltip>

            <Tooltip content="Ordered List">
                <IconButton
                    size="1"
                    variant={editor.isActive('orderedList') ? 'solid' : 'ghost'}
                    color="gray"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    style={{fontSize: '12px', fontWeight: 700}}
                >
                    1.
                </IconButton>
            </Tooltip>

            <div className="wysiwyg-toolbar-separator" />

            <Tooltip content="Insert Table">
                <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => editor.chain().focus().insertTable({rows: 3, cols: 3, withHeaderRow: true}).run()}
                >
                    <TableIcon width="16" height="16" />
                </IconButton>
            </Tooltip>

            {isInTable && (
                <>
                    <div className="wysiwyg-toolbar-separator" />

                    <Tooltip content="Add column after">
                        <IconButton
                            size="1"
                            variant="ghost"
                            color="gray"
                            onClick={() => editor.chain().focus().addColumnAfter().run()}
                        >
                            <span style={{display: 'flex', alignItems: 'center', fontSize: '11px', gap: '1px'}}>
                                <PlusIcon width="12" height="12" />Col
                            </span>
                        </IconButton>
                    </Tooltip>

                    <Tooltip content="Remove column">
                        <IconButton
                            size="1"
                            variant="ghost"
                            color="red"
                            onClick={() => editor.chain().focus().deleteColumn().run()}
                        >
                            <span style={{display: 'flex', alignItems: 'center', fontSize: '11px', gap: '1px'}}>
                                <MinusIcon width="12" height="12" />Col
                            </span>
                        </IconButton>
                    </Tooltip>

                    <Tooltip content="Add row after">
                        <IconButton
                            size="1"
                            variant="ghost"
                            color="gray"
                            onClick={() => editor.chain().focus().addRowAfter().run()}
                        >
                            <span style={{display: 'flex', alignItems: 'center', fontSize: '11px', gap: '1px'}}>
                                <PlusIcon width="12" height="12" />Row
                            </span>
                        </IconButton>
                    </Tooltip>

                    <Tooltip content="Remove row">
                        <IconButton
                            size="1"
                            variant="ghost"
                            color="red"
                            onClick={() => editor.chain().focus().deleteRow().run()}
                        >
                            <span style={{display: 'flex', alignItems: 'center', fontSize: '11px', gap: '1px'}}>
                                <MinusIcon width="12" height="12" />Row
                            </span>
                        </IconButton>
                    </Tooltip>

                    <Tooltip content="Delete table">
                        <IconButton
                            size="1"
                            variant="ghost"
                            color="red"
                            onClick={() => editor.chain().focus().deleteTable().run()}
                        >
                            <TrashIcon width="14" height="14" />
                        </IconButton>
                    </Tooltip>
                </>
            )}

            <div className="wysiwyg-toolbar-separator" />

            <Tooltip content="Math equation">
                <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => {
                        // Insert an inline math node
                        editor.chain().focus().insertContent({
                            type: 'latexMathInline',
                            attrs: {latex: 'x^2', rawLatex: null},
                        }).run();
                    }}
                    style={{fontSize: '14px', fontWeight: 700}}
                >
                    &Sigma;
                </IconButton>
            </Tooltip>
        </div>
    );
}
