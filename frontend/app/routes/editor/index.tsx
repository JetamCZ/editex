import {Link, type LoaderFunctionArgs, useLoaderData, useNavigate, useParams} from "react-router";
import {getApiClient} from "~/lib/axios.server";
import type {Project} from "../../../types/project";
import type {ProjectMember} from "../../../types/member";
import {useState, useEffect} from "react";
import {Box, Text, Button} from "@radix-ui/themes";
import ProjectMembers from "./members";
import {useProjectFiles} from "~/hooks/useProjectFiles";
import ProjectFiles from "./ProjectFiles";
import {ContentType, typeMapping} from "~/const/ContentType";
import CollaborativeEditor from "~/components/CollaborationEditor";
import PdfViewer from "~/components/PdfViewer";
import type {CompilationResult} from "~/hooks/useLatexCompilation";

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

const EditorPage = () => {
    const {project, members} = useLoaderData<typeof loader>();
    const params = useParams();
    const navigate = useNavigate();
    const [selectedFileId, setSelectedFileId] = useState<string | null>(params.fileId || null);
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);

    const {data: uploadedFiles = [], isLoading: loadingFiles} = useProjectFiles({
        projectId: project.id
    });

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

    console.log("selectedFile", selectedFile);

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

    return (
        <div className="grid" style={{
            height: "100vh",
            gridTemplateColumns: showPdfPreview
                ? "16rem 1fr 1fr"  // sidebar | editor | pdf
                : "16rem auto"      // sidebar | editor
        }}>
            {/* Left Sidebar - File Tree */}
            <Box
                className="py-4"
                style={{
                    borderRight: "1px solid var(--gray-6)",
                    backgroundColor: "#fff",
                }}
            >
                <Box className="pb-4 px-6 border-b border-gray-a6">
                    <Link to="/dashboard">
                        <img src="/logo.svg" className="h-10"/>
                    </Link>
                </Box>

                <ProjectMembers project={project} members={members}/>

                <ProjectFiles projectId={project.id} handleFileClick={handleFileClick} selectedFileId={selectedFileId}/>

                {/* Debug: Toggle PDF Preview */}
                <Box p="3" style={{ borderTop: '1px solid var(--gray-6)' }}>
                    <Button
                        onClick={() => setShowPdfPreview(!showPdfPreview)}
                        size="1"
                        variant="soft"
                        style={{ width: '100%' }}
                    >
                        {showPdfPreview ? 'Hide' : 'Show'} PDF Preview
                    </Button>
                    {currentPdfUrl && (
                        <Text size="1" style={{ display: 'block', marginTop: '8px', color: 'green' }}>
                            PDF Ready
                        </Text>
                    )}
                </Box>
            </Box>
            <Box style={{ minWidth: 0, overflow: 'hidden' }}>
                {!selectedFile ? (
                    <Box p="3">
                        <Text color="gray">Select a file from the tree to start editing</Text>
                    </Box>
                ) : isTextFile ? (
                    <CollaborativeEditor
                        selectedFile={selectedFile}
                        onCompilationSuccess={handleCompilationSuccess}
                    />
                ) : (
                    <Box p="3">
                        <img src={selectedFile.s3Url} alt={selectedFile.originalFileName} />
                    </Box>
                )}
            </Box>

            {/* PDF Preview Panel */}
            {showPdfPreview && currentPdfUrl && (
                <Box style={{ borderLeft: '1px solid var(--gray-6)', minWidth: 0, overflow: 'hidden' }}>
                    <PdfViewer
                        pdfUrl={currentPdfUrl}
                        fileName={selectedFile?.originalFileName.replace('.tex', '.pdf') || 'output.pdf'}
                    />
                </Box>
            )}
        </div>
    )
}


export default EditorPage;
