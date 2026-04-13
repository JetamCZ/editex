import type {Editor} from '@tiptap/react';
import {Tooltip, IconButton, DropdownMenu} from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Table,
    TableCellsMerge,
    Trash2,
    Image,
    Sigma,
    ChevronDown,
    Heading1,
    Heading2,
    Heading3,
    Plus,
    Minus,
    FileInput,
    Link,
    type LucideIcon,
} from 'lucide-react';

interface Props {
    editor: Editor | null;
    onInsertLink?: () => void;
}

function ToolbarButton({
    tooltip,
    icon: Icon,
    isActive,
    onClick,
    color,
    iconSize = 18,
}: {
    tooltip: string;
    icon: LucideIcon;
    isActive?: boolean;
    onClick: () => void;
    color?: 'gray' | 'red';
    iconSize?: number;
}) {
    return (
        <Tooltip content={tooltip}>
            <IconButton
                size="2"
                variant={isActive ? 'solid' : 'ghost'}
                color={color ?? 'gray'}
                onClick={onClick}
                className="wysiwyg-toolbar-btn"
            >
                <Icon size={iconSize} strokeWidth={2} />
            </IconButton>
        </Tooltip>
    );
}

function HeadingDropdown({editor}: {editor: Editor}) {
    const { t } = useTranslation();
    const activeLevel = [1, 2, 3].find((l) => editor.isActive('heading', {level: l}));
    const icons = [Heading1, Heading2, Heading3];
    const ActiveIcon = activeLevel ? icons[activeLevel - 1] : Heading1;

    return (
        <DropdownMenu.Root>
            <Tooltip content={t('wysiwygEditor.toolbar.headings')}>
                <DropdownMenu.Trigger>
                    <button className={`wysiwyg-toolbar-dropdown-trigger ${activeLevel ? 'active' : ''}`}>
                        <ActiveIcon size={18} strokeWidth={2} />
                        <ChevronDown size={12} strokeWidth={2} />
                    </button>
                </DropdownMenu.Trigger>
            </Tooltip>
            <DropdownMenu.Content size="1" variant="soft">
                <DropdownMenu.Item
                    onSelect={() => editor.chain().focus().toggleHeading({level: 1}).run()}
                    className={editor.isActive('heading', {level: 1}) ? 'wysiwyg-dropdown-active' : ''}
                >
                    <Heading1 size={16} strokeWidth={2} />
                    {t('wysiwygEditor.toolbar.heading1')}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    onSelect={() => editor.chain().focus().toggleHeading({level: 2}).run()}
                    className={editor.isActive('heading', {level: 2}) ? 'wysiwyg-dropdown-active' : ''}
                >
                    <Heading2 size={16} strokeWidth={2} />
                    {t('wysiwygEditor.toolbar.heading2')}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    onSelect={() => editor.chain().focus().toggleHeading({level: 3}).run()}
                    className={editor.isActive('heading', {level: 3}) ? 'wysiwyg-dropdown-active' : ''}
                >
                    <Heading3 size={16} strokeWidth={2} />
                    {t('wysiwygEditor.toolbar.heading3')}
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}

function TableDropdown({editor}: {editor: Editor}) {
    const { t } = useTranslation();
    return (
        <DropdownMenu.Root>
            <Tooltip content={t('wysiwygEditor.toolbar.tableOptions')}>
                <DropdownMenu.Trigger>
                    <button className="wysiwyg-toolbar-dropdown-trigger">
                        <TableCellsMerge size={18} strokeWidth={2} />
                        <ChevronDown size={12} strokeWidth={2} />
                    </button>
                </DropdownMenu.Trigger>
            </Tooltip>
            <DropdownMenu.Content size="1" variant="soft">
                <DropdownMenu.Label>{t('wysiwygEditor.toolbar.columns')}</DropdownMenu.Label>
                <DropdownMenu.Item onSelect={() => editor.chain().focus().addColumnAfter().run()}>
                    <Plus size={14} strokeWidth={2} />
                    {t('wysiwygEditor.toolbar.addColumn')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => editor.chain().focus().deleteColumn().run()} color="red">
                    <Minus size={14} strokeWidth={2} />
                    {t('wysiwygEditor.toolbar.removeColumn')}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Label>{t('wysiwygEditor.toolbar.rows')}</DropdownMenu.Label>
                <DropdownMenu.Item onSelect={() => editor.chain().focus().addRowAfter().run()}>
                    <Plus size={14} strokeWidth={2} />
                    {t('wysiwygEditor.toolbar.addRow')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => editor.chain().focus().deleteRow().run()} color="red">
                    <Minus size={14} strokeWidth={2} />
                    {t('wysiwygEditor.toolbar.removeRow')}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onSelect={() => editor.chain().focus().deleteTable().run()} color="red">
                    <Trash2 size={14} strokeWidth={2} />
                    {t('wysiwygEditor.toolbar.deleteTable')}
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}

export default function WysiwygToolbar({editor, onInsertLink}: Props) {
    const { t } = useTranslation();
    if (!editor) return null;

    const isInTable = editor.isActive('table');

    return (
        <div className="wysiwyg-toolbar">
            {/* Text formatting */}
            <div className="wysiwyg-toolbar-group">
                <ToolbarButton
                    tooltip={t('wysiwygEditor.toolbar.bold')}
                    icon={Bold}
                    isActive={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                />
                <ToolbarButton
                    tooltip={t('wysiwygEditor.toolbar.italic')}
                    icon={Italic}
                    isActive={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                />
                <ToolbarButton
                    tooltip={t('wysiwygEditor.toolbar.underline')}
                    icon={Underline}
                    isActive={editor.isActive('underline')}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                />
            </div>

            <div className="wysiwyg-toolbar-separator" />

            {/* Headings */}
            <div className="wysiwyg-toolbar-group">
                <HeadingDropdown editor={editor} />
            </div>

            <div className="wysiwyg-toolbar-separator" />

            {/* Lists */}
            <div className="wysiwyg-toolbar-group">
                <ToolbarButton
                    tooltip={t('wysiwygEditor.toolbar.bulletList')}
                    icon={List}
                    isActive={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                />
                <ToolbarButton
                    tooltip={t('wysiwygEditor.toolbar.orderedList')}
                    icon={ListOrdered}
                    isActive={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                />
            </div>

            <div className="wysiwyg-toolbar-separator" />

            {/* Table */}
            <div className="wysiwyg-toolbar-group">
                <ToolbarButton
                    tooltip={t('wysiwygEditor.toolbar.insertTable')}
                    icon={Table}
                    onClick={() => editor.chain().focus().insertTable({rows: 3, cols: 3, withHeaderRow: true}).run()}
                />
                {isInTable && <TableDropdown editor={editor} />}
            </div>

            <div className="wysiwyg-toolbar-separator" />

            {/* Insert */}
            <div className="wysiwyg-toolbar-group">
                <ToolbarButton
                    tooltip={t('wysiwygEditor.toolbar.insertFigure')}
                    icon={Image}
                    onClick={() => {
                        editor.chain().focus().insertContent({
                            type: 'latexFigure',
                            attrs: {imagePath: 'image.png', caption: '', rawLatex: null},
                        }).run();
                    }}
                />
                <ToolbarButton
                    tooltip={t('wysiwygEditor.toolbar.mathEquation')}
                    icon={Sigma}
                    onClick={() => {
                        editor.chain().focus().insertContent({
                            type: 'latexMathInline',
                            attrs: {latex: 'x^2', rawLatex: null},
                        }).run();
                    }}
                />
                <ToolbarButton
                    tooltip={t('wysiwygEditor.toolbar.insertLink')}
                    icon={Link}
                    onClick={() => onInsertLink?.()}
                />
                <ToolbarButton
                    tooltip={t('wysiwygEditor.toolbar.inputFile')}
                    icon={FileInput}
                    onClick={() => {
                        editor.chain().focus().insertContent({
                            type: 'latexInput',
                            attrs: {filePath: 'file', rawLatex: null},
                        }).run();
                    }}
                />
            </div>
        </div>
    );
}
