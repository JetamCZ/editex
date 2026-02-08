import {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {createPortal} from 'react-dom';
import {useProjectFiles} from '~/hooks/useProjectFiles';
import type {ProjectFile} from '../../../types/file';

interface InputFilePopupProps {
    filePath: string;
    onSave: (filePath: string) => void;
    onCancel: () => void;
    baseProject?: string;
    branch?: string;
}

export default function InputFilePopup({filePath, onSave, onCancel, baseProject, branch}: InputFilePopupProps) {
    const [path, setPath] = useState(filePath);
    const pathRef = useRef<HTMLInputElement>(null);

    const {data: files = []} = useProjectFiles({
        baseProject: baseProject || '',
        branch,
        enabled: !!baseProject,
    });

    const texFiles = useMemo(() => {
        return files.filter((f: ProjectFile) => {
            const ext = f.originalFileName.toLowerCase().split('.').pop();
            return ext === 'tex' || ext === 'sty' || ext === 'cls' || ext === 'bib';
        });
    }, [files]);

    useEffect(() => {
        pathRef.current?.focus();
        pathRef.current?.select();
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            onSave(path);
        }
    }, [path, onSave, onCancel]);

    const buildRelativePath = useCallback((file: ProjectFile) => {
        const folder = file.projectFolder?.replace(/^\/+/, '') || '';
        // Strip .tex extension since \input doesn't require it
        const name = file.originalFileName.replace(/\.tex$/, '');
        return folder ? `${folder}/${name}` : name;
    }, []);

    const handleFileSelect = useCallback((file: ProjectFile) => {
        setPath(buildRelativePath(file));
    }, [buildRelativePath]);

    const isSelected = useCallback((file: ProjectFile) => {
        return path === buildRelativePath(file);
    }, [path, buildRelativePath]);

    return createPortal(
        <div className="math-popup-overlay" onClick={onCancel}>
            <div className="math-popup" onClick={e => e.stopPropagation()}>
                <div className="math-popup-header">
                    <span>Input File</span>
                    <span style={{fontSize: '12px', color: '#999', fontWeight: 400}}>
                        Ctrl+Enter to save
                    </span>
                </div>
                <div className="math-popup-body" onKeyDown={handleKeyDown}>
                    {texFiles.length > 0 && (
                        <>
                            <label className="image-popup-label">Project files</label>
                            <div className="input-file-list">
                                {texFiles.map((file: ProjectFile) => (
                                    <button
                                        key={file.id}
                                        type="button"
                                        className={`input-file-list-item${isSelected(file) ? ' selected' : ''}`}
                                        onClick={() => handleFileSelect(file)}
                                        title={file.originalFileName}
                                    >
                                        <span className="input-file-list-icon">T</span>
                                        <span className="input-file-list-name">
                                            {file.projectFolder
                                                ? `${file.projectFolder.replace(/^\/+/, '')}/${file.originalFileName}`
                                                : file.originalFileName}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    <label className="image-popup-label" style={texFiles.length > 0 ? {marginTop: '12px'} : undefined}>
                        File path
                    </label>
                    <input
                        ref={pathRef}
                        className="image-popup-input"
                        value={path}
                        onChange={e => setPath(e.target.value)}
                        placeholder="e.g. chapters/introduction"
                    />
                    <div className="input-file-preview">
                        <code className="input-file-preview-code">\input{'{' + path + '}'}</code>
                    </div>
                </div>
                <div className="math-popup-footer">
                    <button className="math-popup-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="math-popup-btn math-popup-btn-primary"
                        onClick={() => onSave(path)}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
