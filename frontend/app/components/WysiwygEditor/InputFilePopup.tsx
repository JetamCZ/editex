import {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {createPortal} from 'react-dom';
import { useTranslation } from 'react-i18next';
import {useProjectFiles} from '~/hooks/useProjectFiles';
import {useFileBranches, useBranchCommits} from '~/hooks/useFileBranches';
import type {ProjectFile, FileBranch, FileCommit} from '../../../types/file';

interface InputFilePopupProps {
    filePath: string;
    onSave: (filePath: string) => void;
    onCancel: () => void;
    baseProject?: string;
    branch?: string;
}

// Parse existing path: "chapter1@branch" or "chapter1#hash" or just "chapter1"
function parseFilePath(filePath: string): { path: string; ref: string; refType: 'none' | 'branch' | 'commit' } {
    const branchMatch = filePath.match(/^(.+)@([^#]+)$/);
    if (branchMatch) return { path: branchMatch[1], ref: branchMatch[2], refType: 'branch' };
    const commitMatch = filePath.match(/^(.+)#(.+)$/);
    if (commitMatch) return { path: commitMatch[1], ref: commitMatch[2], refType: 'commit' };
    return { path: filePath, ref: '', refType: 'none' };
}

export default function InputFilePopup({filePath, onSave, onCancel, baseProject, branch}: InputFilePopupProps) {
    const { t } = useTranslation();
    const parsed = useMemo(() => parseFilePath(filePath), [filePath]);
    const [path, setPath] = useState(parsed.path);
    const [versionRef, setVersionRef] = useState(parsed.refType === 'commit' ? parsed.ref : (parsed.ref || 'main'));
    const [refType, setRefType] = useState<'branch' | 'commit'>(parsed.refType === 'commit' ? 'commit' : 'branch');
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
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

    // Auto-detect selected file from path
    useEffect(() => {
        const match = texFiles.find(f => {
            const rel = buildRelativePath(f);
            return rel === path || rel === parsed.path;
        });
        if (match) setSelectedFileId(match.id);
    }, [texFiles, path, parsed.path]);

    useEffect(() => {
        pathRef.current?.focus();
        pathRef.current?.select();
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSave();
        }
    }, [path, versionRef, refType, onCancel]);

    const buildRelativePath = useCallback((file: ProjectFile) => {
        const folder = file.projectFolder?.replace(/^\/+/, '') || '';
        const name = file.originalFileName.replace(/\.tex$/, '');
        return folder ? `${folder}/${name}` : name;
    }, []);

    const handleFileSelect = useCallback((file: ProjectFile) => {
        setPath(buildRelativePath(file));
        setSelectedFileId(file.id);
    }, [buildRelativePath]);

    const isSelected = useCallback((file: ProjectFile) => {
        return path === buildRelativePath(file);
    }, [path, buildRelativePath]);

    const handleSave = useCallback(() => {
        let fullPath = path;
        if (refType === 'branch' && versionRef) {
            fullPath = `${path}@${versionRef}`;
        } else if (refType === 'commit' && versionRef) {
            fullPath = `${path}#${versionRef}`;
        }
        onSave(fullPath);
    }, [path, refType, versionRef, onSave]);

    // Build preview
    const previewPath = useMemo(() => {
        if (refType === 'branch' && versionRef) return `${path}@${versionRef}`;
        if (refType === 'commit' && versionRef) return `${path}#${versionRef}`;
        return path;
    }, [path, refType, versionRef]);

    return createPortal(
        <div className="math-popup-overlay" onClick={onCancel}>
            <div className="math-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                <div className="math-popup-header">
                    <span>{t('wysiwygEditor.inputFilePopup.title')}</span>
                    <span style={{fontSize: '12px', color: '#999', fontWeight: 400}}>
                        {t('wysiwygEditor.inputFilePopup.ctrlEnter')}
                    </span>
                </div>
                <div className="math-popup-body" onKeyDown={handleKeyDown}>
                    {texFiles.length > 0 && (
                        <>
                            <label className="image-popup-label">{t('wysiwygEditor.inputFilePopup.projectFiles')}</label>
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
                                        {file.activeBranchName && file.activeBranchName !== 'main' && (
                                            <span style={{
                                                fontSize: '10px',
                                                backgroundColor: '#dbeafe',
                                                color: '#1d4ed8',
                                                borderRadius: '6px',
                                                padding: '1px 5px',
                                                marginLeft: 'auto',
                                                flexShrink: 0,
                                            }}>
                                                {file.activeBranchName}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    <label className="image-popup-label" style={texFiles.length > 0 ? {marginTop: '12px'} : undefined}>
                        {t('wysiwygEditor.inputFilePopup.filePath')}
                    </label>
                    <input
                        ref={pathRef}
                        className="image-popup-input"
                        value={path}
                        onChange={e => setPath(e.target.value)}
                        placeholder={t('wysiwygEditor.inputFilePopup.filePathPlaceholder')}
                    />

                    {/* Version selector */}
                    {selectedFileId && (
                        <VersionSelector
                            fileId={selectedFileId}
                            refType={refType}
                            versionRef={versionRef}
                            onRefTypeChange={setRefType}
                            onVersionRefChange={setVersionRef}
                        />
                    )}

                    <div className="input-file-preview">
                        <code className="input-file-preview-code">\input{'{' + previewPath + '}'}</code>
                    </div>
                </div>
                <div className="math-popup-footer">
                    <button className="math-popup-btn" onClick={onCancel}>
                        {t('wysiwygEditor.inputFilePopup.cancel')}
                    </button>
                    <button
                        className="math-popup-btn math-popup-btn-primary"
                        onClick={handleSave}
                    >
                        {t('wysiwygEditor.inputFilePopup.save')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function VersionSelector({ fileId, refType, versionRef, onRefTypeChange, onVersionRefChange }: {
    fileId: string;
    refType: 'branch' | 'commit';
    versionRef: string;
    onRefTypeChange: (type: 'branch' | 'commit') => void;
    onVersionRefChange: (ref: string) => void;
}) {
    const { t } = useTranslation();
    const { data: branches = [] } = useFileBranches(fileId);

    // Find the active branch for commit listing
    const activeBranch = branches.find(b => refType === 'branch' && b.name === versionRef) || branches[0];

    return (
        <div style={{ marginTop: '12px' }}>
            <label className="image-popup-label">{t('wysiwygEditor.inputFilePopup.version')}</label>

            {/* Ref type tabs */}
            <div style={{
                display: 'flex',
                gap: '2px',
                marginBottom: '8px',
                backgroundColor: '#f1f5f9',
                borderRadius: '6px',
                padding: '2px',
            }}>
                {(['branch', 'commit'] as const).map(type => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => onRefTypeChange(type)}
                        style={{
                            flex: 1,
                            padding: '5px 8px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: refType === type ? 600 : 400,
                            backgroundColor: refType === type ? '#fff' : 'transparent',
                            color: refType === type ? '#111' : '#666',
                            boxShadow: refType === type ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.1s',
                        }}
                    >
                        {type === 'branch' ? t('wysiwygEditor.inputFilePopup.variantTab') : t('wysiwygEditor.inputFilePopup.versionTab')}
                    </button>
                ))}
            </div>

            {/* Branch picker */}
            {refType === 'branch' && branches.length > 0 && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                }}>
                    {branches.map(branch => (
                        <button
                            key={branch.id}
                            type="button"
                            onClick={() => onVersionRefChange(branch.name)}
                            style={{
                                padding: '4px 10px',
                                border: versionRef === branch.name
                                    ? '2px solid #3b82f6'
                                    : '1px solid #d1d5db',
                                borderRadius: '14px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: versionRef === branch.name ? 600 : 400,
                                backgroundColor: versionRef === branch.name ? '#eff6ff' : '#fff',
                                color: versionRef === branch.name ? '#1d4ed8' : '#374151',
                                transition: 'all 0.1s',
                            }}
                        >
                            {branch.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Commit picker */}
            {refType === 'commit' && (
                <CommitPicker
                    branches={branches}
                    versionRef={versionRef}
                    onVersionRefChange={onVersionRefChange}
                />
            )}
        </div>
    );
}

function CommitPicker({ branches, versionRef, onVersionRefChange }: {
    branches: FileBranch[];
    versionRef: string;
    onVersionRefChange: (ref: string) => void;
}) {
    const { t } = useTranslation();
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
        branches[0]?.id || null
    );
    const { data: commits = [] } = useBranchCommits(selectedBranchId);

    return (
        <div>
            {/* Branch filter for commits */}
            {branches.length > 1 && (
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '6px',
                }}>
                    {branches.map(b => (
                        <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBranchId(b.id)}
                            style={{
                                padding: '2px 8px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                backgroundColor: selectedBranchId === b.id ? '#e2e8f0' : 'transparent',
                                color: selectedBranchId === b.id ? '#111' : '#888',
                            }}
                        >
                            {b.name}
                        </button>
                    ))}
                </div>
            )}

            {commits.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#999', padding: '8px 0' }}>
                    {t('wysiwygEditor.inputFilePopup.noVersions')}
                </div>
            ) : (
                <div style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                }}>
                    {commits.map((commit: FileCommit) => (
                        <button
                            key={commit.id}
                            type="button"
                            onClick={() => onVersionRefChange(commit.hash)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px',
                                border: versionRef === commit.hash
                                    ? '2px solid #22c55e'
                                    : '1px solid #e5e7eb',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                backgroundColor: versionRef === commit.hash ? '#f0fdf4' : '#fff',
                                textAlign: 'left',
                                transition: 'all 0.1s',
                            }}
                        >
                            <code style={{
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                color: '#16a34a',
                                fontWeight: 600,
                                flexShrink: 0,
                            }}>
                                {commit.hash}
                            </code>
                            <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: '#374151',
                            }}>
                                {commit.message || t('wysiwygEditor.inputFilePopup.noMessage')}
                            </span>
                            <span style={{
                                fontSize: '10px',
                                color: '#9ca3af',
                                flexShrink: 0,
                                marginLeft: 'auto',
                            }}>
                                {new Date(commit.createdAt).toLocaleDateString()}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
