export type RightPanelMode = 'pdf' | 'wysiwyg';

interface Props {
    mode: RightPanelMode;
    onModeChange: (mode: RightPanelMode) => void;
}

export default function RightPanelToggle({mode, onModeChange}: Props) {
    return (
        <div style={{
            display: 'flex',
            padding: '6px 12px',
            borderBottom: '1px solid var(--gray-6, #e6e6e6)',
            backgroundColor: '#fff',
            gap: '2px',
            flexShrink: 0,
        }}>
            <button
                onClick={() => onModeChange('pdf')}
                style={{
                    padding: '4px 14px',
                    fontSize: '13px',
                    fontWeight: mode === 'pdf' ? 600 : 400,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: mode === 'pdf' ? 'var(--blue-7, #93c5fd)' : 'transparent',
                    backgroundColor: mode === 'pdf' ? 'var(--blue-3, #eff6ff)' : 'transparent',
                    color: mode === 'pdf' ? 'var(--blue-11, #1e40af)' : 'var(--gray-11, #6b7280)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                }}
            >
                PDF Preview
            </button>
            <button
                onClick={() => onModeChange('wysiwyg')}
                style={{
                    padding: '4px 14px',
                    fontSize: '13px',
                    fontWeight: mode === 'wysiwyg' ? 600 : 400,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: mode === 'wysiwyg' ? 'var(--blue-7, #93c5fd)' : 'transparent',
                    backgroundColor: mode === 'wysiwyg' ? 'var(--blue-3, #eff6ff)' : 'transparent',
                    color: mode === 'wysiwyg' ? 'var(--blue-11, #1e40af)' : 'var(--gray-11, #6b7280)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                }}
            >
                Visual Editor
            </button>
        </div>
    );
}
