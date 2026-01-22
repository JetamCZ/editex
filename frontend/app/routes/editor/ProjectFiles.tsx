import { useState, useMemo } from "react";
import {useProjectFiles} from "~/hooks/useProjectFiles";
import {useDeleteFile} from "~/hooks/useDeleteFile";
import {useMoveFile} from "~/hooks/useMoveFile";
import buildFileTree from "~/lib/buildFileTree";
import {Box} from "@radix-ui/themes";
import {FileTreeNode} from "~/components/FileTreeNode";
import MoveFileDialog from "~/components/MoveFileDialog";

interface Props {
    baseProject: string
    branch: string
    selectedFileId: string | null
    handleFileClick: (fileId: string) => void
    onFileDeleted?: (fileId: string) => void
}

const ProjectFiles = ({baseProject, branch, selectedFileId, handleFileClick, onFileDeleted}: Props) => {
    const [moveDialogState, setMoveDialogState] = useState<{
        open: boolean;
        fileId: string;
        fileName: string;
        currentFolder: string;
    }>({ open: false, fileId: "", fileName: "", currentFolder: "" });

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

    const moveFileMutation = useMoveFile({
        baseProject,
        branch,
        onSuccess: () => {
            setMoveDialogState(prev => ({ ...prev, open: false }));
        }
    });

    const fileTree = buildFileTree(uploadedFiles);

    // Extract unique folders from files
    const folders = useMemo(() => {
        const folderSet = new Set<string>();
        folderSet.add("/files"); // Always include root
        uploadedFiles.forEach(file => {
            if (file.projectFolder) {
                folderSet.add(file.projectFolder);
            }
        });
        return Array.from(folderSet).sort();
    }, [uploadedFiles]);

    const handleDeleteFile = (fileId: string, fileName: string) => {
        deleteFileMutation.mutate(fileId, {
            onSuccess: () => {
                onFileDeleted?.(fileId);
            }
        });
    };

    const handleMoveFile = (fileId: string, fileName: string, currentFolder: string) => {
        setMoveDialogState({
            open: true,
            fileId,
            fileName,
            currentFolder
        });
    };

    const handleConfirmMove = (targetFolder: string) => {
        moveFileMutation.mutate({
            fileId: moveDialogState.fileId,
            targetFolder
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
                        onMoveFile={handleMoveFile}
                        selectedFileId={selectedFileId}
                    />
                ))}
            </Box>

            <MoveFileDialog
                open={moveDialogState.open}
                onOpenChange={(open) => setMoveDialogState(prev => ({ ...prev, open }))}
                fileName={moveDialogState.fileName}
                currentFolder={moveDialogState.currentFolder}
                folders={folders}
                onMove={handleConfirmMove}
                isMoving={moveFileMutation.isPending}
            />
        </Box>
    )

}

export default ProjectFiles;
