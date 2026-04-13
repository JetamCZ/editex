import {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {createPortal} from 'react-dom';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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

    const buildRelativePath = useCallback((file: ProjectFile) => {
        const folder = file.projectFolder?.replace(/^\/+/, '') || '';
        return folder ? `${folder}/${file.originalFileName}` : file.originalFileName;
    }, []);

    const handleImageSelect = useCallback((file: ProjectFile) => {
        setPath(buildRelativePath(file));
    }, [buildRelativePath]);

    const isSelected = useCallback((file: ProjectFile) => {
        return path === buildRelativePath(file);
    }, [path, buildRelativePath]);

    return createPortal(
        <div className="math-popup-overlay" onClick={onCancel}>
            <div className="math-popup" onClick={e => e.stopPropagation()}>
                <div className="math-popup-header">
                    <span>{t('wysiwygEditor.imagePopup.title')}</span>
                    <span style={{fontSize: '12px', color: '#999', fontWeight: 400}}>
                        {t('wysiwygEditor.imagePopup.ctrlEnter')}
                    </span>
                </div>
                <div className="math-popup-body" onKeyDown={handleKeyDown}>
                    {imageFiles.length > 0 && (
                        <>
                            <label className="image-popup-label">{t('wysiwygEditor.imagePopup.uploadedImages')}</label>
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
                        {t('wysiwygEditor.imagePopup.imagePath')}
                    </label>
                    <input
                        ref={pathRef}
                        className="image-popup-input"
                        value={path}
                        onChange={e => setPath(e.target.value)}
                        placeholder={t('wysiwygEditor.imagePopup.imagePathPlaceholder')}
                    />
                    <label className="image-popup-label" style={{marginTop: '12px'}}>
                        {t('wysiwygEditor.imagePopup.caption')}
                    </label>
                    <input
                        className="image-popup-input"
                        value={cap}
                        onChange={e => setCap(e.target.value)}
                        placeholder={t('wysiwygEditor.imagePopup.captionPlaceholder')}
                    />
                    <div className="image-popup-preview">
                        <span className="latex-figure-icon">{'\u{1F5BC}'}</span>
                        <span className="latex-figure-path">{path || 'image'}</span>
                        {cap && <div className="image-popup-preview-caption">{cap}</div>}
                    </div>
                </div>
                <div className="math-popup-footer">
                    <button className="math-popup-btn" onClick={onCancel}>
                        {t('wysiwygEditor.imagePopup.cancel')}
                    </button>
                    <button
                        className="math-popup-btn math-popup-btn-primary"
                        onClick={() => onSave(path, cap)}
                    >
                        {t('wysiwygEditor.imagePopup.save')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
