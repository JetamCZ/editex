import {useNavigate, useParams, useOutletContext, useSearchParams} from "react-router";
import { useTranslation } from 'react-i18next';
import type {Project} from "../../../types/project";
import {useState, useEffect, useRef, useCallback} from "react";
import {createPortal} from "react-dom";
import {Box, Text, Select, Tooltip, IconButton} from "@radix-ui/themes";
import {useProjectFiles} from "~/hooks/useProjectFiles";
import {useProjectFolders} from "~/hooks/useProjectFolders";
import ProjectFiles from "./ProjectFiles";
import {ContentType, getFileContentType} from "~/const/ContentType";
import {FolderRole, roleIncludes} from "../../../types/permission";
import {Eye} from "lucide-react";
import CollaborativeEditor, {type CollaborativeEditorRef} from "~/components/CollaborationEditor";
import PdfViewer from "~/components/PdfViewer";
import FileUploadModal from "~/components/FileUploadModal";
import CreateFileModal from "~/components/CreateFileModal";
import CompilationErrorDialog from "~/components/CompilationErrorDialog";
import {type CompilationResult, useLatexCompilation} from "~/hooks/useLatexCompilation";
import {useProjectDownload} from "~/hooks/useProjectDownload";
import EditorToolbar from "~/components/EditorToolbar";
import {FileTextIcon, PlayIcon, DownloadIcon} from "@radix-ui/react-icons";
import {Upload} from "lucide-react";
import EditorModeToggle, {type EditorMode} from "~/components/EditorModeToggle";
import FileBranchSelector from "~/components/FileBranchSelector";
import WysiwygEditor from "~/components/WysiwygEditor";
import FolderAccessModal from "~/components/FolderAccessModal";
import {UserPlus} from "lucide-react";

export function meta({ matches }: { matches: Array<{ data?: { project?: Project } }> }) {
    const parentData = matches.find(m => m.data?.project)?.data;
    const projectName = parentData?.project?.name || "Editor";
    return [
        { title: `Editor - ${projectName} - Editex` },
    ];
}

interface OutletContextType {
    project: Project;
}

const EditorPage = () => {
    const { t } = useTranslation();
    const {project} = useOutletContext<OutletContextType>();
    const params = useParams();
    const navigate = useNavigate();
    // Derive directly from the route param. Holding a separate state and syncing
    // it from params would let setSelectedFileId+navigate fall out of sync for a
    // render — the sync effect would then revert selectedFileId to the stale
    // params.fileId, kicking off a stale refetch that races with the new file's
    // refetch and could leave Monaco showing the wrong file's content.
    const selectedFileId: string | null = params.fileId ?? null;
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [createFileModalOpen, setCreateFileModalOpen] = useState(false);
    const [compilationError, setCompilationError] = useState<{
        open: boolean;
        errorMessage: string | null;
        compilationLog: string | null;
    }>({ open: false, errorMessage: null, compilationLog: null });
    const [compileTarget, setCompileTarget] = useState<string>("main.tex");
    const [editorMode, setEditorMode] = useState<EditorMode>('latex');
    const [wysiwygContent, setWysiwygContent] = useState<string>('');
    const [headerActionsContainer, setHeaderActionsContainer] = useState<HTMLElement | null>(null);
    const [editorState, setEditorState] = useState<{
        changeHistory: any[];
        isConnected: boolean;
        sessionId: string;
        words: number;
        characters: number;
    }>({changeHistory: [], isConnected: false, sessionId: '', words: 0, characters: 0});
    const [debugPanelOpen, setDebugPanelOpen] = useState(false);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);

    const [autoSave, setAutoSave] = useState<boolean>(true);

    useEffect(() => {
        const stored = localStorage.getItem('autoSave');
        if (stored !== null) {
            setAutoSave(stored === 'true');
        }
    }, []);

    const handleAutoSaveChange = useCallback((value: boolean) => {
        setAutoSave(value);
        localStorage.setItem('autoSave', String(value));
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem('editorMode');
        if (stored === 'wysiwyg' || stored === 'latex') setEditorMode(stored);
    }, []);

    const editorRef = useRef<CollaborativeEditorRef>(null);

    const {data: uploadedFiles = [], isLoading: loadingFiles} = useProjectFiles({
        projectId: project.id,
    });
    const {data: projectFolders = []} = useProjectFolders(project.id);
    const rootFolder = projectFolders.find(f => f.parentId === null) ?? null;

    const compilationMutation = useLatexCompilation();
    const downloadMutation = useProjectDownload();

    // Derive list of .tex files for compilation target dropdown
    const texFiles = uploadedFiles.filter(f =>
        f.originalFileName.toLowerCase().endsWith('.tex')
    );

    // Get header actions container
    useEffect(() => {
        const container = document.getElementById('header-actions');
        setHeaderActionsContainer(container);
    }, []);

    // Poll editor state for toolbar
    useEffect(() => {
        const interval = setInterval(() => {
            if (editorRef.current) {
                const content = editorRef.current.getContent?.() ?? '';
                const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
                setEditorState({
                    changeHistory: editorRef.current.changeHistory,
                    isConnected: editorRef.current.isConnected,
                    sessionId: editorRef.current.sessionId,
                    words,
                    characters: content.length,
                });
            } else {
                setEditorState(prev => (prev.words === 0 && prev.characters === 0 ? prev : {...prev, words: 0, characters: 0}));
            }
        }, 500);

        return () => clearInterval(interval);
    }, []);

    // Auto-select main.tex when no file is in the URL.
    useEffect(() => {
        if (params.fileId || uploadedFiles.length === 0) return;
        const mainTexFile = uploadedFiles.find(f =>
            f.originalFileName.toLowerCase() === 'main.tex'
        );
        if (mainTexFile) {
            navigate(`/project/${project.baseProject}/file/${mainTexFile.id}`, {replace: true});
        }
    }, [params.fileId, uploadedFiles, project.id, navigate]);

    // Auto-select compile target when files load
    useEffect(() => {
        if (texFiles.length > 0) {
            // Check if current compileTarget exists in texFiles
            const exists = texFiles.some(f => f.originalFileName === compileTarget);
            if (!exists) {
                // Try to find main.tex, otherwise use first .tex file
                const mainTex = texFiles.find(f => f.originalFileName.toLowerCase() === 'main.tex');
                setCompileTarget(mainTex ? mainTex.originalFileName : texFiles[0].originalFileName);
            }
        }
    }, [texFiles, compileTarget]);

    const handleFileClick = (fileId: string) => {
        navigate(`/project/${project.baseProject}/file/${fileId}`);
    };

    const selectedFile = uploadedFiles.find(f => f.id === selectedFileId);

    const selectedFileRole: FolderRole | null = (() => {
        if (!selectedFile) return null;
        const folderPath = selectedFile.projectFolder || "/";
        return projectFolders.find(f => f.path === folderPath)?.effectiveRole ?? null;
    })();
    const isReadOnly = !roleIncludes(selectedFileRole, FolderRole.EDITOR);

    const fileContentType = selectedFile
        ? getFileContentType(selectedFile.fileType, selectedFile.originalFileName)
        : null;
    const isTextFile = fileContentType === ContentType.TEXT;
    const isImageFile = fileContentType === ContentType.IMAGE;
    const isPdfFile = fileContentType === ContentType.PDF;
    const isTexFileSelected = selectedFile?.originalFileName.endsWith('.tex') ?? false;
    const effectiveMode: EditorMode = isTexFileSelected ? editorMode : 'latex';

    const handleEditorModeChange = useCallback((mode: EditorMode) => {
        setEditorMode(mode);
        localStorage.setItem('editorMode', mode);
        if (mode === 'latex') {
            requestAnimationFrame(() => {
                editorRef.current?.triggerLayout();
            });
        }
    }, []);

    const handleCompilationResult = (result: CompilationResult) => {
        if (result.success && result.pdfUrl) {
            setCurrentPdfUrl(result.pdfUrl);
            // Clear any previous error
            setCompilationError({ open: false, errorMessage: null, compilationLog: null });
        } else {
            // Show error dialog
            setCompilationError({
                open: true,
                errorMessage: result.errorMessage,
                compilationLog: result.compilationLog
            });
        }
    };

    const handleCompile = () => {
        compilationMutation.mutate(
            {projectId: project.id, targetFile: compileTarget},
            {
                onSuccess: (result) => {
                    handleCompilationResult(result);
                },
                onError: (error) => {
                    console.error("Compilation failed:", error);
                    setCompilationError({
                        open: true,
                        errorMessage: error instanceof Error ? error.message : "An unexpected error occurred",
                        compilationLog: null
                    });
                }
            }
        );
    };

    const handleDownload = () => {
        downloadMutation.mutate(
            {projectId: project.id},
            {
                onSuccess: (result) => {
                    const link = document.createElement('a');
                    link.href = result.zipUrl;
                    link.download = 'project.zip';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                },
                onError: (error) => {
                    console.error("Download failed:", error);
                }
            }
        );
    };

    const handleReload = () => {
        editorRef.current?.handleReloadFile();
    };

    const handleShowChanges = () => {
        setDebugPanelOpen(prev => !prev);
    };

    const handleSendChanges = () => {
        editorRef.current?.handleSendChanges();
    };

    // Sync Monaco content to WYSIWYG when mode becomes visible or content changes
    useEffect(() => {
        if (effectiveMode !== 'wysiwyg' || !editorRef.current?.onContentChange) return;

        // Get initial content
        const initialContent = editorRef.current.getContent?.() || '';
        if (initialContent) {
            setWysiwygContent(initialContent);
        }

        // Subscribe to ongoing changes
        const unsub = editorRef.current.onContentChange((content: string) => {
            setWysiwygContent(content);
        });

        return unsub;
    }, [effectiveMode, selectedFileId]);

    const handleWysiwygContentChange = useCallback((latex: string) => {
        editorRef.current?.replaceContent?.(latex);
    }, []);

    const handleBranchChanged = useCallback((branchName: string) => {
        editorRef.current?.handleReloadFile();
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (branchName === 'main') {
                next.delete('branch');
            } else {
                next.set('branch', branchName);
            }
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // Header actions rendered via portal
    const headerActions = headerActionsContainer && createPortal(
        <>
            {selectedFile && isTextFile && (
                <FileBranchSelector
                    selectedFile={selectedFile}
                    onBranchChanged={handleBranchChanged}
                    initialBranch={searchParams.get('branch') ?? undefined}
                />
            )}
            {selectedFile && isTexFileSelected && (
                <EditorModeToggle mode={editorMode} onModeChange={handleEditorModeChange} />
            )}
            {selectedFile && isTextFile && (
                <EditorToolbar
                    changeHistory={editorState.changeHistory}
                    isConnected={editorState.isConnected}
                    onReload={handleReload}
                    onShowChanges={handleShowChanges}
                    onSendChanges={handleSendChanges}
                    autoSave={autoSave}
                    onAutoSaveChange={handleAutoSaveChange}
                />
            )}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--gray-3)',
                borderRadius: '8px',
                padding: '0 8px',
                height: '36px',
                gap: '6px',
                overflow: 'hidden',
            }}>
                <Select.Root
                    value={compileTarget}
                    onValueChange={setCompileTarget}
                    disabled={texFiles.length === 0}
                >
                    <Select.Trigger variant="ghost" style={{minWidth: "120px", height: '100%', borderRadius: 0}} />
                    <Select.Content>
                        {texFiles.map(file => (
                            <Select.Item key={file.id} value={file.originalFileName}>
                                {file.originalFileName}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>
                <div style={{width: '1px', height: '20px', backgroundColor: 'var(--gray-6)'}} />
                <Tooltip content={t('editor.index.compile')}>
                    <IconButton
                        size="2"
                        variant="ghost"
                        color="gray"
                        onClick={handleCompile}
                        disabled={texFiles.length === 0 || compilationMutation.isPending}
                        loading={compilationMutation.isPending}
                        style={{width: '32px', height: '32px'}}
                    >
                        <PlayIcon />
                    </IconButton>
                </Tooltip>
                <div style={{width: '1px', height: '20px', backgroundColor: 'var(--gray-6)'}} />
                <Tooltip content={t('editor.index.download')}>
                    <IconButton
                        size="2"
                        variant="ghost"
                        color="gray"
                        onClick={handleDownload}
                        disabled={downloadMutation.isPending}
                        loading={downloadMutation.isPending}
                        style={{width: '32px', height: '32px'}}
                    >
                        <DownloadIcon />
                    </IconButton>
                </Tooltip>
            </div>
        </>,
        headerActionsContainer
    );

    return (
        <>
            {headerActions}

            {/* Files Panel */}
            <aside style={{
                width: "260px",
                backgroundColor: "#fff",
                borderRight: "1px solid var(--gray-6)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                flexShrink: 0
            }}>
                <div style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--gray-6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}>
                    <Text size="2" weight="bold" style={{color: "var(--gray-11)", letterSpacing: "0.05em"}}>{t('editor.index.filesHeading')}</Text>
                    <div style={{display: "flex", gap: "4px"}}>
                        <button
                            onClick={() => setUploadModalOpen(true)}
                            style={{background: "none", border: "none", cursor: "pointer", color: "var(--gray-9)", padding: "4px"}}
                        >
                            <Upload width={14} height={14} />
                        </button>
                        <button
                            onClick={() => setCreateFileModalOpen(true)}
                            style={{background: "none", border: "none", cursor: "pointer", color: "var(--gray-9)", padding: "4px"}}
                            title="Create new file"
                        >
                            <FileTextIcon width="14" height="14" />
                        </button>
                    </div>
                </div>

                <div style={{flex: 1, overflow: "auto"}}>
                    <ProjectFiles
                        projectId={project.id}
                        projectSlug={project.baseProject}
                        handleFileClick={handleFileClick}
                        selectedFileId={selectedFileId}
                        onFileDeleted={(fileId) => {
                            if (selectedFileId === fileId) {
                                navigate(`/project/${project.baseProject}`);
                            }
                        }}
                    />
                </div>

                <div style={{
                    padding: "12px 14px",
                    borderTop: "1px solid var(--gray-5)",
                    flexShrink: 0,
                }}>
                    <button
                        onClick={() => setInviteModalOpen(true)}
                        title={t('editor.index.inviteCollaboratorsHint')}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            width: "100%",
                            padding: "10px 14px",
                            background: "var(--accent-3)",
                            border: "1px solid var(--accent-6)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            color: "var(--accent-11)",
                            fontSize: "14px",
                            fontWeight: 500,
                        }}
                    >
                        <UserPlus width={16} height={16} style={{flexShrink: 0}} />
                        {t('editor.index.inviteCollaborators')}
                    </button>
                </div>

            </aside>

            <FolderAccessModal
                open={inviteModalOpen}
                onOpenChange={setInviteModalOpen}
                folder={rootFolder}
                projectId={project.id}
                projectSlug={project.baseProject}
            />

            {/* Editor Area + Content */}
            <div style={{flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative"}}>
                {selectedFile && isTextFile && isReadOnly && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        backgroundColor: "var(--amber-3)",
                        borderBottom: "1px solid var(--amber-6)",
                        color: "var(--amber-12)",
                        fontSize: "13px",
                        flexShrink: 0,
                    }}>
                        <Eye size={14} />
                        <span>{t('editor.index.viewOnlyBanner')}</span>
                    </div>
                )}
                <div style={{flex: 1, display: "flex", minHeight: 0}}>
                    {/* CollaborativeEditor — always mounted for text files, hidden in WYSIWYG mode */}
                    {selectedFile && isTextFile && (
                        <div style={effectiveMode === 'wysiwyg' ? {
                            position: 'absolute',
                            width: 0,
                            height: 0,
                            overflow: 'hidden',
                            visibility: 'hidden' as const,
                        } : {
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column' as const,
                        }}>
                            <CollaborativeEditor
                                ref={editorRef}
                                selectedFile={selectedFile}
                                autoSave={autoSave}
                                readOnly={isReadOnly}
                            />
                        </div>
                    )}

                    {/* WYSIWYG Editor — shown in WYSIWYG mode for .tex files */}
                    {selectedFile && isTextFile && isTexFileSelected && (
                        <div style={{
                            flex: 1,
                            minWidth: 0,
                            display: effectiveMode === 'wysiwyg' ? 'flex' : 'none',
                            flexDirection: 'column',
                        }}>
                            <WysiwygEditor
                                content={wysiwygContent}
                                onContentChange={handleWysiwygContentChange}
                                visible={effectiveMode === 'wysiwyg'}
                                projectId={project.id}
                                readOnly={isReadOnly}
                            />
                        </div>
                    )}

                    {/* Non-text file viewers */}
                    {!selectedFile ? (
                        <Box p="3" style={{flex: 1}}>
                            <Text color="gray">{t('editor.index.selectFile')}</Text>
                        </Box>
                    ) : !isTextFile && isImageFile ? (
                        <Box
                            p="4"
                            style={{
                                flex: 1,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'var(--gray-2)',
                                overflow: 'auto',
                                gap: '16px'
                            }}
                        >
                            <img
                                src={selectedFile.s3Url}
                                alt={selectedFile.originalFileName}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: 'calc(100% - 40px)',
                                    objectFit: 'contain',
                                    borderRadius: '4px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}
                            />
                            <a
                                href={selectedFile.s3Url}
                                download={selectedFile.originalFileName}
                                style={{
                                    color: 'var(--blue-11)',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                {t('editor.index.downloadFile', { name: selectedFile.originalFileName })}
                            </a>
                        </Box>
                    ) : !isTextFile && isPdfFile ? (
                        <Box
                            style={{
                                flex: 1,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <iframe
                                src={selectedFile.s3Url}
                                style={{
                                    flex: 1,
                                    width: '100%',
                                    border: 'none'
                                }}
                                title={selectedFile.originalFileName}
                            />
                        </Box>
                    ) : !isTextFile ? (
                        <Box
                            p="4"
                            style={{
                                flex: 1,
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'var(--gray-2)'
                            }}
                        >
                            <Text color="gray">
                                {t('editor.index.cannotPreview')} <a href={selectedFile.s3Url} download>{t('editor.index.downloadFileLink')}</a>
                            </Text>
                        </Box>
                    ) : null}

                    {/* Right Panel: PDF Preview — only in LaTeX Code mode for .tex files */}
                    {effectiveMode === 'latex' && isTexFileSelected && (
                        <Box style={{borderLeft: '1px solid var(--gray-6)', minWidth: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column'}}>
                            {currentPdfUrl ? (
                                <PdfViewer
                                    pdfUrl={currentPdfUrl}
                                    fileName={selectedFile?.originalFileName.replace('.tex', '.pdf') || 'output.pdf'}
                                />
                            ) : (
                                <Box p="4" style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-2)'}}>
                                    <Text color="gray" size="2" align="center">
                                        {t('editor.index.compileTip')}
                                    </Text>
                                </Box>
                            )}
                        </Box>
                    )}
                </div>

                {/* Status Bar */}
                <footer style={{
                    height: "28px",
                    backgroundColor: "#fff",
                    borderTop: "1px solid var(--gray-6)",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 16px",
                    justifyContent: "space-between",
                    flexShrink: 0,
                    fontSize: "12px"
                }}>
                    <div style={{display: "flex", alignItems: "center", gap: "16px"}}>
                        {selectedFile && isTextFile && (
                            <>
                                <span style={{color: "var(--gray-11)"}}>{t('editor.index.words', { n: editorState.words })}</span>
                                <span style={{color: "var(--gray-11)"}}>{t('editor.index.characters', { n: editorState.characters })}</span>
                            </>
                        )}
                    </div>
                    <div style={{display: "flex", alignItems: "center", gap: "16px"}}>
                        {selectedFile && isTextFile ? (
                            <>
                                <span style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    color: editorState.isConnected ? "var(--green-11)" : "var(--gray-11)"
                                }}>
                                    <span style={{
                                        width: "8px",
                                        height: "8px",
                                        borderRadius: "50%",
                                        backgroundColor: editorState.isConnected ? "var(--green-9)" : "var(--gray-9)"
                                    }} />
                                    {editorState.isConnected ? t('editor.index.connected') : t('editor.index.disconnected')}
                                </span>
                                {editorState.sessionId && (
                                    <span style={{color: "var(--gray-11)"}}>
                                        {t('editor.index.session', { id: editorState.sessionId.substring(0, 8) })}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span style={{color: "var(--gray-11)"}}>{t('editor.index.ready')}</span>
                        )}
                    </div>
                </footer>

                {/* Debug Panel */}
                {debugPanelOpen && (
                    <div style={{
                        position: 'absolute',
                        bottom: '28px',
                        left: '260px',
                        right: 0,
                        maxHeight: '300px',
                        backgroundColor: '#1e1e1e',
                        color: '#d4d4d4',
                        borderTop: '2px solid var(--blue-9)',
                        overflow: 'auto',
                        zIndex: 50,
                        fontFamily: 'monospace',
                        fontSize: '12px',
                    }}>
                        <div style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            backgroundColor: '#1e1e1e',
                        }}>
                            <span style={{fontWeight: 'bold', color: '#569cd6'}}>
                                Debug: changeHistory ({editorState.changeHistory.length} ops)
                            </span>
                            <button
                                onClick={() => setDebugPanelOpen(false)}
                                style={{background: 'none', border: 'none', color: '#d4d4d4', cursor: 'pointer', fontSize: '14px'}}
                            >
                                ✕
                            </button>
                        </div>
                        <pre style={{margin: 0, padding: '8px 12px', whiteSpace: 'pre-wrap'}}>
                            {editorState.changeHistory.length === 0
                                ? '// No unsaved changes'
                                : JSON.stringify(editorState.changeHistory, null, 2)
                            }
                        </pre>
                    </div>
                )}
            </div>

            {/* File Upload Modal */}
            <FileUploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                projectId={project.id}
                folder="/"
            />

            {/* Create File Modal */}
            <CreateFileModal
                open={createFileModalOpen}
                onOpenChange={setCreateFileModalOpen}
                projectId={project.id}
            />

            {/* Compilation Error Dialog */}
            <CompilationErrorDialog
                open={compilationError.open}
                onOpenChange={(open) => setCompilationError(prev => ({ ...prev, open }))}
                errorMessage={compilationError.errorMessage}
                compilationLog={compilationError.compilationLog}
                projectId={project.id}
                sourceFile={compileTarget}
            />
        </>
    );
};

export default EditorPage;
