import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import {useProjectFiles} from "~/hooks/useProjectFiles";
import {useDeleteFile} from "~/hooks/useDeleteFile";
import {useMoveFile} from "~/hooks/useMoveFile";
import {useProjectFolders} from "~/hooks/useProjectFolders";
import {useCreateFolder, useDeleteFolder, useRenameFolder} from "~/hooks/useFolderMutations";
import buildFileTree from "~/lib/buildFileTree";
import {Box, Dialog, Button, Flex, TextField} from "@radix-ui/themes";
import {FileTreeNode} from "~/components/FileTreeNode";
import MoveFileDialog from "~/components/MoveFileDialog";
import FolderAccessModal from "~/components/FolderAccessModal";
import type {ProjectFolder} from "../../../types/permission";

interface Props {
    projectId: number
    projectSlug: string
    selectedFileId: string | null
    handleFileClick: (fileId: string) => void
    onFileDeleted?: (fileId: string) => void
}

const ProjectFiles = ({projectId, projectSlug, selectedFileId, handleFileClick, onFileDeleted}: Props) => {
    const { t } = useTranslation();
    const [moveDialogState, setMoveDialogState] = useState<{
        open: boolean;
        fileId: string;
        fileName: string;
        currentFolder: string;
    }>({ open: false, fileId: "", fileName: "", currentFolder: "" });

    const [accessModalFolder, setAccessModalFolder] = useState<ProjectFolder | null>(null);
    const [createFolderDialog, setCreateFolderDialog] = useState<{open: boolean; parentId: number | null; parentPath: string}>({
        open: false, parentId: null, parentPath: "/"
    });
    const [newFolderName, setNewFolderName] = useState("");
    const [renameFolderDialog, setRenameFolderDialog] = useState<{open: boolean; folderId: number | null; currentName: string}>({
        open: false, folderId: null, currentName: ""
    });
    const [renameFolderName, setRenameFolderName] = useState("");

    const {data: uploadedFiles = []} = useProjectFiles({projectId});
    const {data: projectFolders = []} = useProjectFolders(projectId);

    const deleteFileMutation = useDeleteFile({
        projectId,
        onSuccess: () => {}
    });

    const moveFileMutation = useMoveFile({
        projectId,
        onSuccess: () => {
            setMoveDialogState(prev => ({ ...prev, open: false }));
        }
    });

    const createFolder = useCreateFolder(projectId);
    const deleteFolder = useDeleteFolder(projectId);
    const renameFolder = useRenameFolder(projectId);

    const fileTree = useMemo(
        () => buildFileTree(uploadedFiles, projectFolders),
        [uploadedFiles, projectFolders]
    );

    const handleDeleteFile = (fileId: string) => {
        deleteFileMutation.mutate(fileId, {
            onSuccess: () => onFileDeleted?.(fileId),
        });
    };

    const handleMoveFile = (fileId: string, fileName: string, currentFolder: string) => {
        setMoveDialogState({ open: true, fileId, fileName, currentFolder });
    };

    const handleConfirmMove = (targetFolder: string) => {
        moveFileMutation.mutate({ fileId: moveDialogState.fileId, targetFolder });
    };

    const handleManageFolderAccess = (folderId: number) => {
        const folder = projectFolders.find(f => f.id === folderId) ?? null;
        setAccessModalFolder(folder);
    };

    const handleCreateSubfolder = (parentId: number, parentPath: string) => {
        setCreateFolderDialog({open: true, parentId, parentPath});
        setNewFolderName("");
    };

    const handleRenameFolder = (folderId: number, currentName: string) => {
        setRenameFolderDialog({open: true, folderId, currentName});
        setRenameFolderName(currentName);
    };

    const handleDeleteFolder = (folderId: number) => {
        deleteFolder.mutate(folderId);
    };

    const submitCreateFolder = () => {
        if (createFolderDialog.parentId == null || !newFolderName.trim()) return;
        createFolder.mutate(
            {parentId: createFolderDialog.parentId, name: newFolderName.trim()},
            {onSuccess: () => setCreateFolderDialog({open: false, parentId: null, parentPath: "/"})}
        );
    };

    const submitRenameFolder = () => {
        if (renameFolderDialog.folderId == null || !renameFolderName.trim()) return;
        renameFolder.mutate(
            {folderId: renameFolderDialog.folderId, name: renameFolderName.trim()},
            {onSuccess: () => setRenameFolderDialog({open: false, folderId: null, currentName: ""})}
        );
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
                        onManageFolderAccess={handleManageFolderAccess}
                        onCreateSubfolder={handleCreateSubfolder}
                        onRenameFolder={handleRenameFolder}
                        onDeleteFolder={handleDeleteFolder}
                        selectedFileId={selectedFileId}
                    />
                ))}
            </Box>

            <MoveFileDialog
                open={moveDialogState.open}
                onOpenChange={(open) => setMoveDialogState(prev => ({ ...prev, open }))}
                fileName={moveDialogState.fileName}
                currentFolder={moveDialogState.currentFolder}
                projectId={projectId}
                onMove={handleConfirmMove}
                isMoving={moveFileMutation.isPending}
            />

            <FolderAccessModal
                open={!!accessModalFolder}
                onOpenChange={(open) => !open && setAccessModalFolder(null)}
                folder={accessModalFolder}
                projectId={projectId}
                projectSlug={projectSlug}
            />

            <Dialog.Root
                open={createFolderDialog.open}
                onOpenChange={(open) => setCreateFolderDialog(prev => ({ ...prev, open }))}
            >
                <Dialog.Content maxWidth="420px">
                    <Dialog.Title>{t('projectFiles.newSubfolder.title')}</Dialog.Title>
                    <Dialog.Description size="2" mb="3" color="gray">
                        {t('projectFiles.newSubfolder.description', { path: createFolderDialog.parentPath })}
                    </Dialog.Description>
                    <TextField.Root
                        placeholder={t('projectFiles.newSubfolder.placeholder')}
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitCreateFolder()}
                        autoFocus
                    />
                    <Flex gap="2" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">{t('projectFiles.newSubfolder.cancel')}</Button>
                        </Dialog.Close>
                        <Button onClick={submitCreateFolder} disabled={createFolder.isPending || !newFolderName.trim()}>
                            {createFolder.isPending ? t('projectFiles.newSubfolder.creating') : t('projectFiles.newSubfolder.submit')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            <Dialog.Root
                open={renameFolderDialog.open}
                onOpenChange={(open) => setRenameFolderDialog(prev => ({ ...prev, open }))}
            >
                <Dialog.Content maxWidth="420px">
                    <Dialog.Title>{t('projectFiles.renameFolder.title')}</Dialog.Title>
                    <TextField.Root
                        value={renameFolderName}
                        onChange={(e) => setRenameFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitRenameFolder()}
                        autoFocus
                    />
                    <Flex gap="2" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">{t('projectFiles.renameFolder.cancel')}</Button>
                        </Dialog.Close>
                        <Button onClick={submitRenameFolder} disabled={renameFolder.isPending || !renameFolderName.trim()}>
                            {renameFolder.isPending ? t('projectFiles.renameFolder.renaming') : t('projectFiles.renameFolder.submit')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Box>
    );
};

export default ProjectFiles;
