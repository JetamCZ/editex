import {useProjectFiles} from "~/hooks/useProjectFiles";
import buildFileTree from "~/lib/buildFileTree";
import {Box, Button, Flex, Text} from "@radix-ui/themes";
import {FileTreeNode} from "~/components/FileTreeNode";
import FileUploadModal from "~/components/FileUploadModal";
import {useState} from "react";
import {Upload, UserPlus} from "lucide-react";

interface Props {
    projectId: string
    selectedFileId: string
    handleFileClick: (fileId: string) => void
}

const ProjectFiles = ({projectId, selectedFileId, handleFileClick}: Props) => {
    const {data: uploadedFiles = [], isLoading: loadingFiles} = useProjectFiles({
        projectId: projectId
    });

    const fileTree = buildFileTree(uploadedFiles);

    const [uploadModalOpen, setUploadModalOpen] = useState(false);


    return (
        <>
            <Box className="px-6 py-4">
                <Flex justify="between" align="center" mb="2">
                    <Text size="2">
                        project files:
                    </Text>
                    <Button size="1" variant="soft" onClick={() => setUploadModalOpen(true)}>
                        <Upload className="h-4" /> Add file
                    </Button>
                </Flex>
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

            <FileUploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                projectId={projectId}
                folder="/files"
            />
        </>

    )

}

export default ProjectFiles;
