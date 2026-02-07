import type {Editor} from '@tiptap/react';
import {Tooltip, IconButton} from '@radix-ui/themes';
import {
    FontBoldIcon,
    FontItalicIcon,
    UnderlineIcon,
    ListBulletIcon,
    HeadingIcon,
    TableIcon,
} from '@radix-ui/react-icons';

interface Props {
    editor: Editor | null;
}

export default function WysiwygToolbar({editor}: Props) {
    if (!editor) return null;

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
