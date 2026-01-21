import {useProjectFiles} from "~/hooks/useProjectFiles";
import {useDeleteFile} from "~/hooks/useDeleteFile";
import buildFileTree from "~/lib/buildFileTree";
import {Box} from "@radix-ui/themes";
import {FileTreeNode} from "~/components/FileTreeNode";

interface Props {
    baseProject: string
    branch: string
    selectedFileId: string | null
    handleFileClick: (fileId: string) => void
    onFileDeleted?: (fileId: string) => void
}

const ProjectFiles = ({baseProject, branch, selectedFileId, handleFileClick, onFileDeleted}: Props) => {
    const {data: uploadedFiles = [], isLoading: loadingFiles} = useProjectFiles({
        baseProject: baseProject,
        branch: branch
    });

    const deleteFileMutation = useDeleteFile({
        baseProject,
        branch,
        onSuccess: () => {
            // Called after successful deletion
        }
    });

    const fileTree = buildFileTree(uploadedFiles);

    const handleDeleteFile = (fileId: string, fileName: string) => {
        deleteFileMutation.mutate(fileId, {
            onSuccess: () => {
                onFileDeleted?.(fileId);
            }
        });
    };

    return (
        <Box className="px-4 py-2">
            <Box>
                {fileTree.map((node) => (
                    <FileTreeNode
                        key={node.path}
                        node={node}
                        onFileClick={handleFileClick}
                        onDeleteFile={handleDeleteFile}
                        selectedFileId={selectedFileId}
                    />
                ))}
            </Box>
        </Box>
    )

}

export default ProjectFiles;
