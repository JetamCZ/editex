import {useState} from "react";
import {useLoaderData, type LoaderFunctionArgs, useRouteLoaderData} from "react-router";
import {Box, Flex, ScrollArea, Text, Card, Separator, Heading, Button, IconButton} from "@radix-ui/themes";
import {FileTreeNode} from "../../components/FileTreeNode";
import FileUploadModal from "../../components/FileUploadModal";
import {getApiClient} from "../../lib/axios.server";
import type {Project} from "../../../types/project";
import buildFileTree from "~/lib/buildFileTree";
import type {User} from "../../../types/user";
import Editor from "~/routes/editor/editor";
import {useProjectFiles} from "~/hooks/useProjectFiles";
import useAuth from "~/hooks/useAuth";


export async function loader({request, params}: LoaderFunctionArgs) {
    const api = await getApiClient(request);
    const {id} = params;

    try {
        const response = await api.get<Project>(`/projects/${id}`);
        return {project: response.data};
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

export default function EditorPage() {
    const {project} = useLoaderData<typeof loader>();
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

    const {bearerToken} = useAuth()

    const [uploadModalOpen, setUploadModalOpen] = useState(false);

    // Use React Query hook for project files
    const {data: uploadedFiles = [], isLoading: loadingFiles, refetch} = useProjectFiles({
        projectId: project.id
    });

    const fileTree = buildFileTree(uploadedFiles);

    // Get the selected file object
    const selectedFile = uploadedFiles.find(f => f.id === selectedFileId);

    const handleFileClick = async (fileId: string) => {
        setSelectedFileId(fileId);

        /*
        // Find the file in uploadedFiles by matching the path
        const file = uploadedFiles.find(f =>
          (f.projectFolder + "/" + f.originalFileName) === path
        );

        if (file) {
          // Set language based on file extension
          setFileLanguage(getLanguageFromFilename(file.originalFileName));

          try {
            // Fetch the file content from S3
            const response = await fetch(file.s3Url);
            const content = await response.text();
            setFileContent(content);
          } catch (error) {
            console.error('Error loading file content:', error);
            setFileContent(`% Error loading file: ${path}\n\n% Could not fetch file from storage.`);
          }
        } else {
          // Fallback for mock files or files not found
          setFileLanguage('latex');
          setFileContent(`% Content of ${path}\n\n\\documentclass{article}\n\\begin{document}\n\nThis file could not be loaded.\n\n\\end{document}`);
        }

         */
    };

    return (
        <>
            <FileUploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                projectId={project.id}
                folder="/files"
                token={bearerToken}
            />

            <Flex style={{height: "100vh"}}>
                {/* Left Sidebar - File Tree */}
                <Box
                    style={{
                        width: "350px",
                        borderRight: "1px solid var(--gray-6)",
                        backgroundColor: "var(--gray-2)",
                    }}
                >
                    <Box p="3">
                        <Heading size="4" mb="1">
                            {project.name}
                        </Heading>
                        <Text size="2" color="gray">
                            Project Files
                        </Text>
                        <Button
                            size="2"
                            style={{width: "100%", marginTop: "12px"}}
                            onClick={() => setUploadModalOpen(true)}
                        >
                            Upload Files
                        </Button>
                    </Box>
                    <Separator size="4"/>
                    <ScrollArea style={{height: "calc(100vh - 120px)"}}>
                        <Box p="2">
                            {loadingFiles ? (
                                <Box p="2">
                                    <Text size="2" color="gray">Loading files...</Text>
                                </Box>
                            ) : fileTree.length > 0 ? (
                                <>
                                    <Text size="1" weight="bold" color="gray"
                                          style={{textTransform: "uppercase", padding: "8px 4px"}}>
                                        Project Files
                                    </Text>
                                    {fileTree.map((node) => (
                                        <FileTreeNode
                                            key={node.path}
                                            node={node}
                                            onFileClick={handleFileClick}
                                            selectedFileId={selectedFileId}
                                        />
                                    ))}
                                </>
                            ) : (
                                <Box p="2">
                                    <Text size="2" color="gray">No files uploaded yet. Click "Upload Files" to get
                                        started.</Text>
                                </Box>
                            )}
                        </Box>
                    </ScrollArea>
                </Box>

                {/* Right Panel - Editor and Preview */}
                <Flex direction="row" style={{flex: 1}}>
                    {/* Editor */}
                    <Box style={{
                        flex: 1,
                        borderRight: "1px solid var(--gray-6)",
                        display: "flex",
                        flexDirection: "column"
                    }}>
                        <Box p="3" style={{borderBottom: "1px solid var(--gray-6)"}}>
                            <Text size="2" color="gray">
                                {selectedFile ? `${selectedFile.projectFolder}/${selectedFile.originalFileName}` : "No file selected"}
                            </Text>
                        </Box>
                        <Box style={{flex: 1}}>
                            <Editor selectedFile={selectedFile}/>
                        </Box>
                    </Box>

                    {/* Preview */}
                    <Box style={{flex: 1, backgroundColor: "var(--gray-1)"}}>
                        <Box p="3" style={{borderBottom: "1px solid var(--gray-6)"}}>
                            <Text size="2" weight="bold">
                                Preview
                            </Text>
                        </Box>
                        <Box p="3">
                            {selectedFile ? (
                                <Card>
                                    <Text color="gray" align="center" style={{padding: "40px"}}>
                                        LaTeX preview will appear here
                                    </Text>
                                </Card>
                            ) : (
                                <Text color="gray">Preview will appear when a file is opened</Text>
                            )}
                        </Box>
                    </Box>
                </Flex>
            </Flex>
        </>
    );
}
