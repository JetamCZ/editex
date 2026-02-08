import {useState, useEffect, useRef, useCallback} from 'react';
import {createPortal} from 'react-dom';

interface MathPopupProps {
    latex: string;
    isBlock: boolean;
    onSave: (newLatex: string) => void;
    onCancel: () => void;
}

export default function MathPopup({latex, isBlock, onSave, onCancel}: MathPopupProps) {
    const [value, setValue] = useState(latex);
    const [previewHtml, setPreviewHtml] = useState('');
    const [error, setError] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Render KaTeX preview
    useEffect(() => {
        const renderPreview = async () => {
            try {
                const katex = await import('katex');
                const html = katex.default.renderToString(value, {
                    throwOnError: true,
                    displayMode: isBlock,
                });
                setPreviewHtml(html);
                setError('');
            } catch (e: unknown) {
                if (e instanceof Error) {
                    setError(e.message);
                }
                setPreviewHtml('');
            }
        };
        renderPreview();
    }, [value, isBlock]);

    // Focus textarea on mount
    useEffect(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
    }, []);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            onSave(value);
        }
    }, [value, onSave, onCancel]);

    return createPortal(
        <div className="math-popup-overlay" onClick={onCancel}>
            <div className="math-popup" onClick={e => e.stopPropagation()}>
                <div className="math-popup-header">
                    <span>{isBlock ? 'Display Math' : 'Inline Math'}</span>
                    <span style={{fontSize: '12px', color: '#999', fontWeight: 400}}>
                        Ctrl+Enter to save
                    </span>
                </div>
                <div className="math-popup-body">
                    <textarea
                        ref={textareaRef}
                        className="math-popup-textarea"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter LaTeX math..."
                    />
                    <div className="math-popup-preview">
                        {error ? (
                            <span className="math-popup-preview-error">{error}</span>
                        ) : (
                            <span dangerouslySetInnerHTML={{__html: previewHtml}} />
                        )}
                    </div>
                </div>
                <div className="math-popup-footer">
                    <button className="math-popup-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="math-popup-btn math-popup-btn-primary" onClick={() => onSave(value)}>
                        Save
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
