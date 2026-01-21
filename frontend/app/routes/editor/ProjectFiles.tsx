import {useProjectFiles} from "~/hooks/useProjectFiles";
import buildFileTree from "~/lib/buildFileTree";
import {Box} from "@radix-ui/themes";
import {FileTreeNode} from "~/components/FileTreeNode";

interface Props {
    baseProject: string
    branch: string
    selectedFileId: string
    handleFileClick: (fileId: string) => void
}

const ProjectFiles = ({baseProject, branch, selectedFileId, handleFileClick}: Props) => {
    const {data: uploadedFiles = [], isLoading: loadingFiles} = useProjectFiles({
        baseProject: baseProject,
        branch: branch
    });

    const fileTree = buildFileTree(uploadedFiles);

    return (
        <Box className="px-4 py-2">
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
    )

}

export default ProjectFiles;
