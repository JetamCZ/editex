import {Tooltip, IconButton, DropdownMenu} from "@radix-ui/themes";
import { useTranslation } from 'react-i18next';
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Table,
    Image,
    Sigma,
    ChevronDown,
    Heading1,
    Heading2,
    Heading3,
    FileInput,
    type LucideIcon,
} from "lucide-react";
import type {ProjectFile} from "../../../types/file";
import "./latex-toolbar.css";

interface LatexToolbarProps {
    selectedFile: ProjectFile;
    /** When true, hide the formatting action row (used for view-only files) */
    hideActions?: boolean;
    onBold: () => void;
    onItalic: () => void;
    onUnderline: () => void;
    onMath: () => void;
    onTable: () => void;
    onImage: () => void;
    onBulletList: () => void;
    onOrderedList: () => void;
    onSection: (level: number) => void;
    onInput: () => void;
}

function ToolbarButton({
    tooltip,
    icon: Icon,
    onClick,
    iconSize = 15,
}: {
    tooltip: string;
    icon: LucideIcon;
    onClick: () => void;
    iconSize?: number;
}) {
    return (
        <Tooltip content={tooltip}>
            <IconButton
                size="1"
                variant="ghost"
                color="gray"
                onClick={onClick}
                className="latex-toolbar-btn"
            >
                <Icon size={iconSize} strokeWidth={2} />
            </IconButton>
        </Tooltip>
    );
}

function HeadingDropdown({onSection}: {onSection: (level: number) => void}) {
    const { t } = useTranslation();
    return (
        <DropdownMenu.Root>
            <Tooltip content={t('latexToolbar.sections')}>
                <DropdownMenu.Trigger>
                    <button className="latex-toolbar-dropdown-trigger">
                        <Heading1 size={15} strokeWidth={2} />
                        <ChevronDown size={10} strokeWidth={2} />
                    </button>
                </DropdownMenu.Trigger>
            </Tooltip>
            <DropdownMenu.Content size="1" variant="soft">
                <DropdownMenu.Item onSelect={() => onSection(1)}>
                    <Heading1 size={14} strokeWidth={2} />
                    \section
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onSection(2)}>
                    <Heading2 size={14} strokeWidth={2} />
                    \subsection
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onSection(3)}>
                    <Heading3 size={14} strokeWidth={2} />
                    \subsubsection
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}

export default function LatexToolbar({
    selectedFile,
    hideActions,
    onBold,
    onItalic,
    onUnderline,
    onMath,
    onTable,
    onImage,
    onBulletList,
    onOrderedList,
    onSection,
    onInput,
}: LatexToolbarProps) {
    const { t } = useTranslation();
    return (
        <>
            {!hideActions && (
                <div className="latex-toolbar">
                    {/* Text formatting */}
                    <div className="latex-toolbar-group">
                        <ToolbarButton tooltip={t('latexToolbar.bold')} icon={Bold} onClick={onBold} />
                        <ToolbarButton tooltip={t('latexToolbar.italic')} icon={Italic} onClick={onItalic} />
                        <ToolbarButton tooltip={t('latexToolbar.underline')} icon={Underline} onClick={onUnderline} />
                    </div>

                    <div className="latex-toolbar-separator" />

                    {/* Headings */}
                    <div className="latex-toolbar-group">
                        <HeadingDropdown onSection={onSection} />
                    </div>

                    <div className="latex-toolbar-separator" />

                    {/* Lists */}
                    <div className="latex-toolbar-group">
                        <ToolbarButton tooltip={t('latexToolbar.bulletList')} icon={List} onClick={onBulletList} />
                        <ToolbarButton tooltip={t('latexToolbar.orderedList')} icon={ListOrdered} onClick={onOrderedList} />
                    </div>

                    <div className="latex-toolbar-separator" />

                    {/* Table */}
                    <div className="latex-toolbar-group">
                        <ToolbarButton tooltip={t('latexToolbar.insertTable')} icon={Table} onClick={onTable} />
                    </div>

                    <div className="latex-toolbar-separator" />

                    {/* Insert */}
                    <div className="latex-toolbar-group">
                        <ToolbarButton tooltip={t('latexToolbar.insertFigure')} icon={Image} onClick={onImage} />
                        <ToolbarButton tooltip={t('latexToolbar.mathEquation')} icon={Sigma} onClick={onMath} />
                        <ToolbarButton tooltip={t('latexToolbar.inputFile')} icon={FileInput} onClick={onInput} />
                    </div>
                </div>
            )}

            {/* File path breadcrumb */}
            <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--gray-6)',
                backgroundColor: '#fff',
                fontSize: '13px',
                color: 'var(--gray-11)'
            }}>
                <span style={{ color: 'var(--gray-10)' }}>workspace</span>
                {selectedFile.projectFolder && selectedFile.projectFolder !== '/' && (
                    <>
                        {selectedFile.projectFolder.split('/').filter(Boolean).map((folder, index) => (
                            <span key={index}>
                                <span style={{ margin: '0 6px', color: 'var(--gray-9)' }}>›</span>
                                <span style={{ color: 'var(--gray-10)' }}>{folder}</span>
                            </span>
                        ))}
                    </>
                )}
                <span style={{ margin: '0 6px', color: 'var(--gray-9)' }}>›</span>
                <span style={{ fontWeight: 500, color: 'var(--gray-12)' }}>{selectedFile.originalFileName}</span>
            </div>
        </>
    );
}
