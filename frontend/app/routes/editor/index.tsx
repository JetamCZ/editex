import {useNavigate, useParams, useOutletContext} from "react-router";
import type {Project} from "../../../types/project";
import type {ProjectMember} from "../../../types/member";
import {useState, useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import {Box, Text, Button, Badge, Select} from "@radix-ui/themes";
import {useProjectFiles} from "~/hooks/useProjectFiles";
import {useBranches} from "~/hooks/useBranches";
import ProjectFiles from "./ProjectFiles";
import {ContentType, getFileContentType} from "~/const/ContentType";
import CollaborativeEditor, {type CollaborativeEditorRef} from "~/components/CollaborationEditor";
import PdfViewer from "~/components/PdfViewer";
import FileUploadModal from "~/components/FileUploadModal";
import CreateFileModal from "~/components/CreateFileModal";
import CreateBranchDialog from "~/components/CreateBranchDialog";
import CompilationErrorDialog from "~/components/CompilationErrorDialog";
import {type CompilationResult, useLatexCompilation} from "~/hooks/useLatexCompilation";
import EditorToolbar from "~/components/EditorToolbar";
import {FileTextIcon, PlayIcon} from "@radix-ui/react-icons";
import {Upload, GitBranch, Plus} from "lucide-react";

interface OutletContextType {
    project: Project;
    members: ProjectMember[];
}

const EditorPage = () => {
    const {project, members} = useOutletContext<OutletContextType>();
    const params = useParams();
    const navigate = useNavigate();
    const [selectedFileId, setSelectedFileId] = useState<string | null>(params.fileId || null);
    const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [createFileModalOpen, setCreateFileModalOpen] = useState(false);
    const [createBranchDialogOpen, setCreateBranchDialogOpen] = useState(false);
    const [compilationError, setCompilationError] = useState<{
        open: boolean;
        errorMessage: string | null;
        compilationLog: string | null;
    }>({ open: false, errorMessage: null, compilationLog: null });
    const [compileTarget, setCompileTarget] = useState<string>("main.tex");
    const [headerActionsContainer, setHeaderActionsContainer] = useState<HTMLElement | null>(null);
    const [editorState, setEditorState] = useState<{
        changeHistory: any[];
        isConnected: boolean;
        sessionId: string;
    }>({changeHistory: [], isConnected: false, sessionId: ''});

    const editorRef = useRef<CollaborativeEditorRef>(null);

    const {data: uploadedFiles = [], isLoading: loadingFiles} = useProjectFiles({
        baseProject: project.baseProject,
        branch: project.branch
    });

    const {data: branches = []} = useBranches({
        baseProject: project.baseProject
    });

    const compilationMutation = useLatexCompilation();

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
                setEditorState({
                    changeHistory: editorRef.current.changeHistory,
                    isConnected: editorRef.current.isConnected,
                    sessionId: editorRef.current.sessionId,
                });
            }
        }, 500);

        return () => clearInterval(interval);
    }, []);

    // Update selectedFileId when URL params change or auto-select main.tex
    useEffect(() => {
        if (params.fileId) {
            setSelectedFileId(params.fileId);
        } else if (!selectedFileId && uploadedFiles.length > 0) {
            // Auto-select main.tex if no file is selected
            const mainTexFile = uploadedFiles.find(f =>
                f.originalFileName.toLowerCase() === 'main.tex'
            );
            if (mainTexFile) {
                setSelectedFileId(mainTexFile.id);
                navigate(`/project/${project.baseProject}/${project.branch}/file/${mainTexFile.id}`, {replace: true});
            }
        }
    }, [params.fileId, uploadedFiles, selectedFileId, project.baseProject, project.branch, navigate]);

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

    const handleFileClick = async (fileId: string) => {
        setSelectedFileId(fileId);
        navigate(`/project/${project.baseProject}/${project.branch}/file/${fileId}`);
    };

    const selectedFile = uploadedFiles.find(f => f.id === selectedFileId);

    const fileContentType = selectedFile
        ? getFileContentType(selectedFile.fileType, selectedFile.originalFileName)
        : null;
    const isTextFile = fileContentType === ContentType.TEXT;
    const isImageFile = fileContentType === ContentType.IMAGE;
    const isPdfFile = fileContentType === ContentType.PDF;

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
            {baseProject: project.baseProject, branch: project.branch, targetFile: compileTarget},
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

    const handleReload = () => {
        editorRef.current?.handleReloadFile();
    };

    const handleShowChanges = () => {
        editorRef.current?.handleShowChanges();
    };

    const handleSendChanges = () => {
        editorRef.current?.handleSendChanges();
    };

    const handleBranchSwitch = (branchName: string) => {
        if (branchName !== project.branch) {
            navigate(`/project/${project.baseProject}/${branchName}`);
        }
    };

    const handleBranchCreated = (branchName: string) => {
        navigate(`/project/${project.baseProject}/${branchName}`);
    };

    // Header actions rendered via portal
    const headerActions = headerActionsContainer && createPortal(
        <>
            {selectedFile && isTextFile && (
                <EditorToolbar
                    changeHistory={editorState.changeHistory}
                    isConnected={editorState.isConnected}
                    onReload={handleReload}
                    onShowChanges={handleShowChanges}
                    onSendChanges={handleSendChanges}
                />
            )}
            <Select.Root
                value={compileTarget}
                onValueChange={setCompileTarget}
                disabled={texFiles.length === 0}
            >
                <Select.Trigger style={{minWidth: "140px"}} />
                <Select.Content>
                    {texFiles.map(file => (
                        <Select.Item key={file.id} value={file.originalFileName}>
                            {file.originalFileName}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select.Root>
            <Button
                size="2"
                style={{backgroundColor: "var(--blue-9)"}}
                onClick={handleCompile}
                disabled={texFiles.length === 0 || compilationMutation.isPending}
                loading={compilationMutation.isPending}
            >
                <PlayIcon /> Compile
            </Button>
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
                    <Text size="2" weight="bold" style={{color: "var(--gray-11)", letterSpacing: "0.05em"}}>FILES</Text>
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
                        baseProject={project.baseProject}
                        branch={project.branch}
                        handleFileClick={handleFileClick}
                        selectedFileId={selectedFileId}
                        onFileDeleted={(fileId) => {
                            if (selectedFileId === fileId) {
                                setSelectedFileId(null);
                                navigate(`/project/${project.baseProject}/${project.branch}`);
                            }
                        }}
                    />
                </div>

                <div style={{borderTop: "1px solid var(--gray-6)"}}>
                    <div style={{
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}>
                        <Text size="2" weight="bold" style={{color: "var(--gray-11)", letterSpacing: "0.05em"}}>
                            <GitBranch className="inline h-3 w-3 mr-1" />
                            BRANCHES
                        </Text>
                        <button
                            onClick={() => setCreateBranchDialogOpen(true)}
                            style={{background: "none", border: "none", cursor: "pointer", color: "var(--gray-9)", padding: "4px"}}
                            title="Create new branch"
                        >
                            <Plus width={14} height={14} />
                        </button>
                    </div>
                    <div style={{padding: "0 16px 16px", maxHeight: "200px", overflowY: "auto"}}>
                        {branches.map((branch) => (
                            <button
                                key={branch.id}
                                onClick={() => handleBranchSwitch(branch.branch)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    marginBottom: "8px",
                                    width: "100%",
                                    background: branch.branch === project.branch ? "var(--blue-3)" : "transparent",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "8px",
                                    cursor: "pointer",
                                    textAlign: "left"
                                }}
                            >
                                <div style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    backgroundColor: branch.branch === project.branch ? "var(--blue-9)" : "var(--gray-6)"
                                }} />
                                <div style={{flex: 1, minWidth: 0}}>
                                    <Text size="2" weight={branch.branch === project.branch ? "bold" : "regular"} style={{display: "block"}}>
                                        {branch.branch}
                                    </Text>
                                    <Text size="1" style={{color: "var(--gray-9)"}}>
                                        {new Date(branch.createdAt).toLocaleDateString()}
                                    </Text>
                                </div>
                                {branch.branch === project.branch && (
                                    <Badge size="1" color="blue">current</Badge>
                                )}
                            </button>
                        ))}
                        {branches.length === 0 && (
                            <Text size="2" color="gray">No branches yet</Text>
                        )}
                    </div>
                </div>
            </aside>

            {/* Editor Area */}
            <div style={{flex: 1, display: "flex", flexDirection: "column", minWidth: 0}}>
                <Box style={{flex: 1, minWidth: 0, overflow: 'hidden'}}>
                    {!selectedFile ? (
                        <Box p="3">
                            <Text color="gray">Select a file from the tree to start editing</Text>
                        </Box>
                    ) : isTextFile ? (
                        <CollaborativeEditor
                            ref={editorRef}
                            selectedFile={selectedFile}
                        />
                    ) : isImageFile ? (
                        <Box
                            p="4"
                            style={{
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
                                Download {selectedFile.originalFileName}
                            </a>
                        </Box>
                    ) : isPdfFile ? (
                        <Box
                            style={{
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
                    ) : (
                        <Box
                            p="4"
                            style={{
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'var(--gray-2)'
                            }}
                        >
                            <Text color="gray">
                                Cannot preview this file type. <a href={selectedFile.s3Url} download>Download file</a>
                            </Text>
                        </Box>
                    )}
                </Box>

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
                        <span style={{display: "flex", alignItems: "center", gap: "4px", color: "var(--green-11)"}}>
                            <span style={{width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--green-9)"}} />
                            Document Valid
                        </span>
                        <span style={{color: "var(--gray-11)"}}>— Words</span>
                        <span style={{color: "var(--gray-11)"}}>— Characters</span>
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
                                    {editorState.isConnected ? 'Connected' : 'Disconnected'}
                                </span>
                                {editorState.sessionId && (
                                    <span style={{color: "var(--gray-11)"}}>
                                        Session: {editorState.sessionId.substring(0, 8)}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span style={{color: "var(--gray-11)"}}>Ready</span>
                        )}
                    </div>
                </footer>
            </div>

            {/* PDF Preview Panel */}
            <Box style={{borderLeft: '1px solid var(--gray-6)', minWidth: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column'}}>
                {currentPdfUrl ? (
                    <PdfViewer
                        pdfUrl={currentPdfUrl}
                        fileName={selectedFile?.originalFileName.replace('.tex', '.pdf') || 'output.pdf'}
                    />
                ) : (
                    <Box p="4" style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-2)'}}>
                        <Text color="gray" size="2" align="center">
                            Click "Compile" to generate PDF preview
                        </Text>
                    </Box>
                )}
            </Box>

            {/* File Upload Modal */}
            <FileUploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                baseProject={project.baseProject}
                branch={project.branch}
                folder="/"
            />

            {/* Create File Modal */}
            <CreateFileModal
                open={createFileModalOpen}
                onOpenChange={setCreateFileModalOpen}
                baseProject={project.baseProject}
                branch={project.branch}
            />

            {/* Create Branch Dialog */}
            <CreateBranchDialog
                open={createBranchDialogOpen}
                onOpenChange={setCreateBranchDialogOpen}
                baseProject={project.baseProject}
                currentBranch={project.branch}
                onBranchCreated={handleBranchCreated}
            />

            {/* Compilation Error Dialog */}
            <CompilationErrorDialog
                open={compilationError.open}
                onOpenChange={(open) => setCompilationError(prev => ({ ...prev, open }))}
                errorMessage={compilationError.errorMessage}
                compilationLog={compilationError.compilationLog}
            />
        </>
    );
};

export default EditorPage;
