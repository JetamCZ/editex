import {type LoaderFunctionArgs, useLoaderData} from "react-router";
import {getApiClient} from "~/lib/axios.server";
import type {Project} from "../../../types/project";
import type {ProjectMember} from "../../../types/member";
import {useState} from "react";
import {Box, Flex, Text} from "@radix-ui/themes";
import ProjectMembers from "./members";
import {FileTreeNode} from "~/components/FileTreeNode";
import buildFileTree from "~/lib/buildFileTree";
import {useProjectFiles} from "~/hooks/useProjectFiles";
import Editor from "~/routes/editor/editor";

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
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);


    const {data: uploadedFiles = [], isLoading: loadingFiles} = useProjectFiles({
        projectId: project.id
    });
    const fileTree = buildFileTree(uploadedFiles);

    const handleFileClick = async (fileId: string) => {
        setSelectedFileId(fileId);
    }

    const selectedFile = uploadedFiles.find(f => f.id === selectedFileId);

    return (
        <Flex style={{height: "100vh"}}>
            {/* Left Sidebar - File Tree */}
            <Box
                className="w-64 py-4 "
                style={{
                    borderRight: "1px solid var(--gray-6)",
                    backgroundColor: "#fff",
                }}
            >
                <Box className="pb-4 px-6 border-b border-gray-a6">
                    <img src="/logo.svg" className="h-10"/>
                </Box>

                <ProjectMembers project={project} members={members}/>

                <Box className="px-6 py-4">
                    <Text size="2">
                        project files:
                    </Text>
                    <Box>
                        {fileTree.map((node) => (
                            <FileTreeNode
                                key={node.path}
                                node={node}
                                onFileClick={handleFileClick}
                                selectedFileId={selectedFileId}
                            />
                        ))}
                    </Box>
                </Box>
            </Box>
            <Box className="w-full">
                <Editor selectedFile={selectedFile}/>
            </Box>
        </Flex>

    )
}


export default EditorPage;
