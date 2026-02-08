import {useState, useEffect, useRef, useCallback} from 'react';
import {createPortal} from 'react-dom';

interface ImagePopupProps {
    imagePath: string;
    caption: string;
    onSave: (imagePath: string, caption: string) => void;
    onCancel: () => void;
}

export default function ImagePopup({imagePath, caption, onSave, onCancel}: ImagePopupProps) {
    const [path, setPath] = useState(imagePath);
    const [cap, setCap] = useState(caption);
    const pathRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        pathRef.current?.focus();
        pathRef.current?.select();
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            onSave(path, cap);
        }
    }, [path, cap, onSave, onCancel]);

    return createPortal(
        <div className="math-popup-overlay" onClick={onCancel}>
            <div className="math-popup" onClick={e => e.stopPropagation()}>
                <div className="math-popup-header">
                    <span>Figure</span>
                    <span style={{fontSize: '12px', color: '#999', fontWeight: 400}}>
                        Ctrl+Enter to save
                    </span>
                </div>
                <div className="math-popup-body" onKeyDown={handleKeyDown}>
                    <label className="image-popup-label">Image path</label>
                    <input
                        ref={pathRef}
                        className="image-popup-input"
                        value={path}
                        onChange={e => setPath(e.target.value)}
                        placeholder="e.g. images/diagram.png"
                    />
                    <label className="image-popup-label" style={{marginTop: '12px'}}>
                        Caption
                    </label>
                    <input
                        className="image-popup-input"
                        value={cap}
                        onChange={e => setCap(e.target.value)}
                        placeholder="Figure caption (optional)"
                    />
                    <div className="image-popup-preview">
                        <span className="latex-figure-icon">{'\u{1F5BC}'}</span>
                        <span className="latex-figure-path">{path || 'image'}</span>
                        {cap && <div className="image-popup-preview-caption">{cap}</div>}
                    </div>
                </div>
                <div className="math-popup-footer">
                    <button className="math-popup-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="math-popup-btn math-popup-btn-primary"
                        onClick={() => onSave(path, cap)}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
