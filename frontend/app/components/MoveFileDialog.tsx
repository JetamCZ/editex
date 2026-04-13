import { Dialog, Button, Flex, Text } from "@radix-ui/themes";
import { Folder } from "lucide-react";
import { useEffect, useState } from "react";
import FolderSelect from "~/components/FolderSelect";
import { useTranslation } from 'react-i18next';

interface MoveFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileName: string;
    currentFolder: string;
    baseProject: string;
    onMove: (targetFolder: string) => void;
    isMoving?: boolean;
}

const displayFolder = (folder: string) => (folder === "/" ? "Root" : folder);

export default function MoveFileDialog({
    open,
    onOpenChange,
    fileName,
    currentFolder,
    baseProject,
    onMove,
    isMoving = false,
}: MoveFileDialogProps) {
    const { t } = useTranslation();
    const [selectedFolder, setSelectedFolder] = useState<string>("");

    useEffect(() => {
        if (open) setSelectedFolder("");
    }, [open, currentFolder]);

    const handleClose = () => {
        if (!isMoving) onOpenChange(false);
    };

    const canMove = !!selectedFolder && selectedFolder !== currentFolder;

    const handleMove = () => {
        if (canMove) onMove(selectedFolder);
    };

    return (
        <Dialog.Root open={open} onOpenChange={handleClose}>
            <Dialog.Content maxWidth="400px">
                <Dialog.Title>
                    <Flex align="center" gap="2">
                        <Folder className="h-5 w-5" />
                        {t('moveFile.title')}
                    </Flex>
                </Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {t('moveFile.description', { name: fileName })}
                </Dialog.Description>

                <Flex direction="column" gap="3">
                    <div style={{
                        padding: "8px 12px",
                        backgroundColor: "var(--gray-3)",
                        borderRadius: "6px",
                        fontSize: "13px"
                    }}>
                        <Text size="1" color="gray">{t('moveFile.currentLocation')}</Text>
                        <Text size="2" weight="medium" style={{ display: "block", marginTop: "2px" }}>
                            {displayFolder(currentFolder)}
                        </Text>
                    </div>

                    <div>
                        <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                            {t('moveFile.moveTo')}
                        </Text>
                        <FolderSelect
                            baseProject={baseProject}
                            value={selectedFolder}
                            onChange={setSelectedFolder}
                            excludePath={currentFolder}
                            allowCreate
                            disabled={isMoving}
                            placeholder={t('moveFile.destinationPlaceholder')}
                        />
                    </div>

                    <Flex gap="3" mt="2" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" disabled={isMoving}>
                                {t('moveFile.cancel')}
                            </Button>
                        </Dialog.Close>
                        <Button
                            onClick={handleMove}
                            disabled={!canMove || isMoving}
                        >
                            {isMoving ? t('moveFile.moving') : t('moveFile.submit')}
                        </Button>
                    </Flex>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
