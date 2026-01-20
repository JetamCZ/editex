import {Link, type LoaderFunctionArgs, useLoaderData, useNavigate, useParams} from "react-router";
import {getApiClient} from "~/lib/axios.server";
import type {Project} from "../../../types/project";
import type {ProjectMember} from "../../../types/member";
import {useState, useEffect, useRef} from "react";
import {Box, Text, Button, Avatar, DropdownMenu, Tooltip} from "@radix-ui/themes";
import {useProjectFiles} from "~/hooks/useProjectFiles";
import ProjectFiles from "./ProjectFiles";
import {ContentType, typeMapping} from "~/const/ContentType";
import CollaborativeEditor, {type CollaborativeEditorRef} from "~/components/CollaborationEditor";
import PdfViewer from "~/components/PdfViewer";
import FileUploadModal from "~/components/FileUploadModal";
import {type CompilationResult, useLatexCompilation} from "~/hooks/useLatexCompilation";
import EditorToolbar from "~/components/EditorToolbar";
import {
    FileTextIcon,
    CounterClockwiseClockIcon,
    GearIcon,
    QuestionMarkCircledIcon,
    ExitIcon,
    PlayIcon,
    GitHubLogoIcon,
    ZoomInIcon,
    ZoomOutIcon,
    DownloadIcon,
    ExternalLinkIcon,
    ResetIcon
} from "@radix-ui/react-icons";
import {Upload} from "lucide-react";
import useAuth from "~/hooks/useAuth";
import getInitials from "~/lib/getInitials";

export async function loader({request, params}: LoaderFunctionArgs) {
    const api = await getApiClient(request);
    const {id} = params;

    try {
        const {data: project} = await api.get<Project>(`/projects/${id}`);
        const {data: members} = await api.get<ProjectMember[]>(`/projects/${id}/members`);


        return {project, members};
    } catch (error) {
        console.error("Error loading project:", error);
        throw new Response("Project not found", {status: 404});
    }
}

export function meta({data}: Route.MetaArgs) {
    return [
        {title: data?.project?.name || "Editor"},
        {name: "description", content: "LaTeX Editor"},
    ];
}

// Icon sidebar items
const iconSidebarItems = [
    { id: 'files', icon: <FileTextIcon width="20" height="20" />, tooltip: 'Files', position: 'top' },
    { id: 'history', icon: <CounterClockwiseClockIcon width="20" height="20" />, tooltip: 'History', position: 'top' },
    { id: 'git', icon: <GitHubLogoIcon width="20" height="20" />, tooltip: 'Version Control', position: 'top' },
];

const iconSidebarBottomItems = [
    { id: 'help', icon: <QuestionMarkCircledIcon width="20" height="20" />, tooltip: 'Help' },
    { id: 'settings', icon: <GearIcon width="20" height="20" />, tooltip: 'Settings' },
];

const EditorPage = () => {
    const {project, members} = useLoaderData<typeof loader>();
    const params = useParams();
    const navigate = useNavigate();
    const {user} = useAuth();
    const initials = getInitials(user?.name || user?.email || "U");
    const [selectedFileId, setSelectedFileId] = useState<string | null>(params.fileId || null);
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
    const [activePanel, setActivePanel] = useState<string>('files');
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [editorState, setEditorState] = useState<{
        changeHistory: any[];
        isConnected: boolean;
        sessionId: string;
    }>({ changeHistory: [], isConnected: false, sessionId: '' });

    const editorRef = useRef<CollaborativeEditorRef>(null);

    const {data: uploadedFiles = [], isLoading: loadingFiles} = useProjectFiles({
        projectId: project.id
    });

    const compilationMutation = useLatexCompilation();

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
    }

    const selectedFile = uploadedFiles.find(f => f.id === selectedFileId);

    const isTextFile = selectedFile &&
        (typeMapping[selectedFile.fileType] === ContentType.TEXT || !typeMapping[selectedFile.fileType]);

    const handleCompilationSuccess = (result: CompilationResult) => {
        console.log("=== COMPILATION SUCCESS ===");
        console.log("Result:", result);
        console.log("Success:", result.success);
        console.log("PDF URL:", result.pdfUrl);

        if (result.success && result.pdfUrl) {
            console.log("Setting PDF URL and showing preview");
            setCurrentPdfUrl(result.pdfUrl);
            setShowPdfPreview(true);
        } else {
            console.warn("Compilation result missing success or pdfUrl");
        }
    };

    const handleCompile = () => {
        compilationMutation.mutate(
            { projectId: project.id },
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

    return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Top Header Bar */}
            <header style={{
                height: "56px",
                backgroundColor: "#fff",
                borderBottom: "1px solid var(--gray-6)",
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                gap: "24px",
                flexShrink: 0
            }}>
                {/* Logo */}
                <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                    <img src="/logo.svg" style={{ height: "32px" }} alt="Editex" />
                </Link>

                {/* Navigation */}
                <nav style={{ display: "flex", gap: "16px" }}>
                    <Link to="/dashboard" style={{ textDecoration: "none" }}>
                        <Text size="2" style={{ color: "var(--gray-11)" }}>Projects</Text>
                    </Link>
                    <Link to="/dashboard" style={{ textDecoration: "none" }}>
                        <Text size="2" style={{ color: "var(--gray-11)" }}>Templates</Text>
                    </Link>
                    <Link to="/dashboard" style={{ textDecoration: "none" }}>
                        <Text size="2" style={{ color: "var(--gray-11)" }}>Settings</Text>
                    </Link>
                </nav>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Editor Toolbar */}
                {selectedFile && isTextFile && (
                    <EditorToolbar
                        changeHistory={editorState.changeHistory}
                        isConnected={editorState.isConnected}
                        onReload={handleReload}
                        onShowChanges={handleShowChanges}
                        onSendChanges={handleSendChanges}
                    />
                )}

                {/* Compile Button */}
                <Button
                    size="2"
                    style={{ backgroundColor: "var(--blue-9)" }}
                    onClick={handleCompile}
                    disabled={!selectedFileId || compilationMutation.isPending}
                    loading={compilationMutation.isPending}
                >
                    <PlayIcon /> Compile
                </Button>

                {/* User Avatar */}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <Avatar
                            size="2"
                            fallback={initials}
                            radius="full"
                            style={{ cursor: "pointer" }}
                        />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                        <DropdownMenu.Item asChild>
                            <Link to="/profile">Profile</Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item asChild>
                            <Link to="/auth/logout" style={{ color: "var(--red-11)" }}>
                                <ExitIcon /> Logout
                            </Link>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </header>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* Icon Sidebar */}
                <aside style={{
                    width: "56px",
                    backgroundColor: "#fff",
                    borderRight: "1px solid var(--gray-6)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    flexShrink: 0
                }}>
                    {/* Top icons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {iconSidebarItems.map((item) => (
                            <Tooltip key={item.id} content={item.tooltip}>
                                <button
                                    onClick={() => setActivePanel(item.id)}
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        border: "none",
                                        borderRadius: "8px",
                                        backgroundColor: activePanel === item.id ? "var(--blue-3)" : "transparent",
                                        color: activePanel === item.id ? "var(--blue-11)" : "var(--gray-11)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    {item.icon}
                                </button>
                            </Tooltip>
                        ))}
                    </div>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Bottom icons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {iconSidebarBottomItems.map((item) => (
                            <Tooltip key={item.id} content={item.tooltip}>
                                <button
                                    onClick={() => {}}
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        border: "none",
                                        borderRadius: "8px",
                                        backgroundColor: "transparent",
                                        color: "var(--gray-11)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    {item.icon}
                                </button>
                            </Tooltip>
                        ))}
                    </div>
                </aside>

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
                    {/* FILES Header */}
                    <div style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--gray-6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}>
                        <Text size="2" weight="bold" style={{ color: "var(--gray-11)", letterSpacing: "0.05em" }}>FILES</Text>
                        <div style={{ display: "flex", gap: "4px" }}>
                            <button
                                onClick={() => setUploadModalOpen(true)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-9)", padding: "4px" }}
                            >
                                <Upload width={14} height={14} />
                            </button>
                            <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-9)", padding: "4px" }}>
                                <FileTextIcon width="14" height="14" />
                            </button>
                        </div>
                    </div>

                    {/* File Tree */}
                    <div style={{ flex: 1, overflow: "auto" }}>
                        <ProjectFiles projectId={project.id} handleFileClick={handleFileClick} selectedFileId={selectedFileId}/>
                    </div>

                    {/* Recent Versions Section */}
                    <div style={{ borderTop: "1px solid var(--gray-6)" }}>
                        <div style={{ padding: "12px 16px" }}>
                            <Text size="2" weight="bold" style={{ color: "var(--gray-11)", letterSpacing: "0.05em" }}>RECENT VERSIONS</Text>
                        </div>
                        <div style={{ padding: "0 16px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--blue-9)" }} />
                                <div>
                                    <Text size="1" style={{ color: "var(--gray-9)" }}>Current</Text>
                                    <Text size="2" weight="medium" style={{ display: "block" }}>Unsaved changes</Text>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Editor Area */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <Box style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
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
                </div>

                {/* PDF Preview Panel */}
                {showPdfPreview && currentPdfUrl && (
                    <Box style={{ borderLeft: '1px solid var(--gray-6)', minWidth: 0, overflow: 'hidden', flex: 1 }}>
                        <PdfViewer
                            pdfUrl={currentPdfUrl}
                            fileName={selectedFile?.originalFileName.replace('.tex', '.pdf') || 'output.pdf'}
                        />
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
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--green-11)" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--green-9)" }} />
                        Document Valid
                    </span>
                    <span style={{ color: "var(--gray-11)" }}>— Words</span>
                    <span style={{ color: "var(--gray-11)" }}>— Characters</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
                                <span style={{ color: "var(--gray-11)" }}>
                                    Session: {editorState.sessionId.substring(0, 8)}
                                </span>
                            )}
                        </>
                    ) : (
                        <span style={{ color: "var(--gray-11)" }}>Ready</span>
                    )}
                </div>
            </footer>

            {/* File Upload Modal */}
            <FileUploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                projectId={project.id}
                folder="/files"
            />
        </div>
    )
}


export default EditorPage;
