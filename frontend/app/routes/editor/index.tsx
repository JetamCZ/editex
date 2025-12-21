import {Link, type LoaderFunctionArgs, useLoaderData, useNavigate, useParams} from "react-router";
import {getApiClient} from "~/lib/axios.server";
import type {Project} from "../../../types/project";
import type {ProjectMember} from "../../../types/member";
import {useState, useEffect} from "react";
import {Box, Text} from "@radix-ui/themes";
import ProjectMembers from "./members";
import {useProjectFiles} from "~/hooks/useProjectFiles";
import CollaborativeEditor from "~/components/CollaborativeEditor";
import ProjectFiles from "./ProjectFiles";
import useAuth from "~/hooks/useAuth";
import {ContentType, typeMapping} from "~/const/ContentType";

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
    const {user, bearerToken} = useAuth();
    const navigate = useNavigate();

    const {fileId} = useParams();
    const [selectedFileId, setSelectedFileId] = useState<string | null>(fileId || null);

    const {data: uploadedFiles = [], isLoading: loadingFiles} = useProjectFiles({
        projectId: project.id
    });

    // Sync selectedFileId with URL param
    useEffect(() => {
        setSelectedFileId(fileId || null);
    }, [fileId]);

    const handleFileClick = async (fileId: string) => {
        navigate(`/project/${project.id}/file/${fileId}`);
    }

    const selectedFile = uploadedFiles.find(f => f.id === selectedFileId);

    // Check if selected file is a text file that supports collaboration
    const isTextFile = selectedFile &&
        (typeMapping[selectedFile.fileType] === ContentType.TEXT || !typeMapping[selectedFile.fileType]);

    return (
        <div className="grid" style={{height: "100vh", gridTemplateColumns: "16rem auto"}}>
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
            </Box>
            <Box className="w-full" style={{height: "100vh"}}>
                {!selectedFile ? (
                    <Box p="3">
                        <Text color="gray">Select a file from the tree to start editing</Text>
                    </Box>
                ) : isTextFile ? (
                    <CollaborativeEditor
                        selectedFile={selectedFile}
                        bearerToken={bearerToken}
                    />
                ) : (
                    <Box p="3">
                        <img src={selectedFile.s3Url} alt={selectedFile.originalFileName} />
                    </Box>
                )}
            </Box>
        </div>
    )
}


export default EditorPage;
