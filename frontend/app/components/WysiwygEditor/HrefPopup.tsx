import {useState, useEffect, useRef, useCallback} from 'react';
import {createPortal} from 'react-dom';

interface HrefPopupProps {
    url: string;
    text: string;
    onSave: (url: string, text: string) => void;
    onCancel: () => void;
}

export default function HrefPopup({url: initialUrl, text: initialText, onSave, onCancel}: HrefPopupProps) {
    const [url, setUrl] = useState(initialUrl);
    const [text, setText] = useState(initialText);
    const urlRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        urlRef.current?.focus();
        urlRef.current?.select();
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            onSave(url, text || url);
        }
    }, [url, text, onSave, onCancel]);

    return createPortal(
        <div className="math-popup-overlay" onClick={onCancel}>
            <div className="math-popup" onClick={e => e.stopPropagation()}>
                <div className="math-popup-header">
                    <span>Edit Link</span>
                    <span style={{fontSize: '12px', color: '#999', fontWeight: 400}}>
                        Ctrl+Enter to save
                    </span>
                </div>
                <div className="math-popup-body">
                    <div style={{marginBottom: '12px'}}>
                        <label className="image-popup-label">URL</label>
                        <input
                            ref={urlRef}
                            className="image-popup-input"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="https://example.com"
                        />
                    </div>
                    <div>
                        <label className="image-popup-label">Display text</label>
                        <input
                            className="image-popup-input"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Link text (leave empty to use URL)"
                        />
                    </div>
                    <div className="href-popup-preview">
                        <a
                            href={url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="latex-href"
                            onClick={e => { if (!url) e.preventDefault(); }}
                        >
                            {text || url || 'link'}
                        </a>
                    </div>
                </div>
                <div className="math-popup-footer">
                    <button className="math-popup-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="math-popup-btn math-popup-btn-primary"
                        onClick={() => onSave(url, text || url)}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
