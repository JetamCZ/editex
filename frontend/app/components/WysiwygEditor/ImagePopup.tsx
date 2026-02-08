import {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {createPortal} from 'react-dom';
import {useProjectFiles} from '~/hooks/useProjectFiles';
import {getFileContentType, ContentType} from '~/const/ContentType';
import type {ProjectFile} from '../../../types/file';

interface ImagePopupProps {
    imagePath: string;
    caption: string;
    onSave: (imagePath: string, caption: string) => void;
    onCancel: () => void;
    baseProject?: string;
    branch?: string;
}

export default function ImagePopup({imagePath, caption, onSave, onCancel, baseProject, branch}: ImagePopupProps) {
    const [path, setPath] = useState(imagePath);
    const [cap, setCap] = useState(caption);
    const pathRef = useRef<HTMLInputElement>(null);

    const {data: files = []} = useProjectFiles({
        baseProject: baseProject || '',
        branch,
        enabled: !!baseProject,
    });

    const imageFiles = useMemo(() => {
        return files.filter((f: ProjectFile) =>
            getFileContentType(f.fileType, f.originalFileName) === ContentType.IMAGE
        );
    }, [files]);

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

    const handleImageSelect = useCallback((file: ProjectFile) => {
        const relativePath = file.projectFolder
            ? `${file.projectFolder}/${file.originalFileName}`
            : file.originalFileName;
        setPath(relativePath);
    }, []);

    const isSelected = useCallback((file: ProjectFile) => {
        const relativePath = file.projectFolder
            ? `${file.projectFolder}/${file.originalFileName}`
            : file.originalFileName;
        return path === relativePath;
    }, [path]);

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
                    {imageFiles.length > 0 && (
                        <>
                            <label className="image-popup-label">Uploaded images</label>
                            <div className="image-popup-grid">
                                {imageFiles.map((file: ProjectFile) => (
                                    <button
                                        key={file.id}
                                        type="button"
                                        className={`image-popup-grid-item${isSelected(file) ? ' selected' : ''}`}
                                        onClick={() => handleImageSelect(file)}
                                        title={file.originalFileName}
                                    >
                                        <img
                                            src={file.s3Url}
                                            alt={file.originalFileName}
                                            className="image-popup-grid-thumb"
                                        />
                                        <span className="image-popup-grid-name">
                                            {file.originalFileName}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    <label className="image-popup-label" style={imageFiles.length > 0 ? {marginTop: '12px'} : undefined}>
                        Image path
                    </label>
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
