import {Tooltip, IconButton} from "@radix-ui/themes";
import {FontBoldIcon, FontItalicIcon, QuoteIcon, ListBulletIcon, TableIcon, ImageIcon} from "@radix-ui/react-icons";
import type {ProjectFile} from "../../../types/file";

interface LatexToolbarProps {
    selectedFile: ProjectFile;
    onBold: () => void;
    onItalic: () => void;
    onMath: () => void;
    onTable: () => void;
    onImage: () => void;
    onQuote: () => void;
    onBulletList: () => void;
}

export default function LatexToolbar({selectedFile, onBold, onItalic, onMath, onTable, onImage, onQuote, onBulletList}: LatexToolbarProps) {
    return (
        <>
            <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--gray-6)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                backgroundColor: '#fff'
            }}>
                <Tooltip content="Bold (Ctrl+B)">
                    <IconButton
                        onClick={onBold}
                        size="2"
                        variant="ghost"
                        color="gray"
                    >
                        <FontBoldIcon width="18" height="18" />
                    </IconButton>
                </Tooltip>
                <Tooltip content="Italic (Ctrl+I)">
                    <IconButton
                        onClick={onItalic}
                        size="2"
                        variant="ghost"
                        color="gray"
                    >
                        <FontItalicIcon width="18" height="18" />
                    </IconButton>
                </Tooltip>
                <Tooltip content="Math equation">
                    <IconButton
                        onClick={onMath}
                        size="2"
                        variant="ghost"
                        color="gray"
                        style={{ fontSize: '18px', fontWeight: 'bold' }}
                    >
                        Σ
                    </IconButton>
                </Tooltip>
                <Tooltip content="Insert table">
                    <IconButton
                        onClick={onTable}
                        size="2"
                        variant="ghost"
                        color="gray"
                    >
                        <TableIcon width="18" height="18" />
                    </IconButton>
                </Tooltip>
                <Tooltip content="Insert image">
                    <IconButton
                        onClick={onImage}
                        size="2"
                        variant="ghost"
                        color="gray"
                    >
                        <ImageIcon width="18" height="18" />
                    </IconButton>
                </Tooltip>
                <Tooltip content="Quote">
                    <IconButton
                        onClick={onQuote}
                        size="2"
                        variant="ghost"
                        color="gray"
                    >
                        <QuoteIcon width="18" height="18" />
                    </IconButton>
                </Tooltip>
                <Tooltip content="Bullet list (Ctrl+Shift+U)">
                    <IconButton
                        onClick={onBulletList}
                        size="2"
                        variant="ghost"
                        color="gray"
                    >
                        <ListBulletIcon width="18" height="18" />
                    </IconButton>
                </Tooltip>
            </div>
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
