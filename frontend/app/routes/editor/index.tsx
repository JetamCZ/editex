import {useNavigate, useParams, useOutletContext} from "react-router";
import type {Project} from "../../../types/project";
import type {ProjectMember} from "../../../types/member";
import {useState, useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import {Box, Text, Button} from "@radix-ui/themes";
import {useProjectFiles} from "~/hooks/useProjectFiles";
import ProjectFiles from "./ProjectFiles";
import {ContentType, typeMapping} from "~/const/ContentType";
import CollaborativeEditor, {type CollaborativeEditorRef} from "~/components/CollaborationEditor";
import PdfViewer from "~/components/PdfViewer";
import FileUploadModal from "~/components/FileUploadModal";
import {type CompilationResult, useLatexCompilation} from "~/hooks/useLatexCompilation";
import EditorToolbar from "~/components/EditorToolbar";
import {FileTextIcon, PlayIcon} from "@radix-ui/react-icons";
import {Upload} from "lucide-react";

interface OutletContextType {
    project: Project;
    members: ProjectMember[];
}

const EditorPage = () => {
    const {project, members} = useOutletContext<OutletContextType>();
    const params = useParams();
    const navigate = useNavigate();
    const [selectedFileId, setSelectedFileId] = useState<string | null>(params.fileId || null);
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [headerActionsContainer, setHeaderActionsContainer] = useState<HTMLElement | null>(null);
    const [editorState, setEditorState] = useState<{
        changeHistory: any[];
        isConnected: boolean;
        sessionId: string;
    }>({changeHistory: [], isConnected: false, sessionId: ''});

    const editorRef = useRef<CollaborativeEditorRef>(null);

    const {data: uploadedFiles = [], isLoading: loadingFiles} = useProjectFiles({
        projectId: project.id
    });

    const compilationMutation = useLatexCompilation();

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

    // Update selectedFileId when URL params change
    useEffect(() => {
        if (params.fileId) {
            setSelectedFileId(params.fileId);
        }
    }, [params.fileId]);

    const handleFileClick = async (fileId: string) => {
        setSelectedFileId(fileId);
        navigate(`/project/${project.id}/file/${fileId}`);
    };

    const selectedFile = uploadedFiles.find(f => f.id === selectedFileId);

    const isTextFile = selectedFile &&
        (typeMapping[selectedFile.fileType as keyof typeof typeMapping] === ContentType.TEXT || !typeMapping[selectedFile.fileType as keyof typeof typeMapping]);

    const handleCompilationSuccess = (result: CompilationResult) => {
        if (result.success && result.pdfUrl) {
            setCurrentPdfUrl(result.pdfUrl);
            setShowPdfPreview(true);
        }
    };

    const handleCompile = () => {
        compilationMutation.mutate(
            {projectId: project.id},
            {
                onSuccess: (result) => {
                    handleCompilationSuccess(result);
                },
                onError: (error) => {
                    console.error("Compilation failed:", error);
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
            <Button
                size="2"
                style={{backgroundColor: "var(--blue-9)"}}
                onClick={handleCompile}
                disabled={!selectedFileId || compilationMutation.isPending}
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
                        <button style={{background: "none", border: "none", cursor: "pointer", color: "var(--gray-9)", padding: "4px"}}>
                            <FileTextIcon width="14" height="14" />
                        </button>
                    </div>
                </div>

                <div style={{flex: 1, overflow: "auto"}}>
                    <ProjectFiles projectId={project.id} handleFileClick={handleFileClick} selectedFileId={selectedFileId} />
                </div>

                <div style={{borderTop: "1px solid var(--gray-6)"}}>
                    <div style={{padding: "12px 16px"}}>
                        <Text size="2" weight="bold" style={{color: "var(--gray-11)", letterSpacing: "0.05em"}}>RECENT VERSIONS</Text>
                    </div>
                    <div style={{padding: "0 16px 16px"}}>
                        <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px"}}>
                            <div style={{width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--blue-9)"}} />
                            <div>
                                <Text size="1" style={{color: "var(--gray-9)"}}>Current</Text>
                                <Text size="2" weight="medium" style={{display: "block"}}>Unsaved changes</Text>
                            </div>
                        </div>
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
                    ) : (
                        <Box p="3">
                            <img src={selectedFile.s3Url} alt={selectedFile.originalFileName} />
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
            {showPdfPreview && currentPdfUrl && (
                <Box style={{borderLeft: '1px solid var(--gray-6)', minWidth: 0, overflow: 'hidden', flex: 1}}>
                    <PdfViewer
                        pdfUrl={currentPdfUrl}
                        fileName={selectedFile?.originalFileName.replace('.tex', '.pdf') || 'output.pdf'}
                    />
                </Box>
            )}

            {/* File Upload Modal */}
            <FileUploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                projectId={project.id}
                folder="/files"
            />
        </>
    );
};

export default EditorPage;
