import { Dialog, Button, Flex, Text } from "@radix-ui/themes";
import { Folder } from "lucide-react";
import { useEffect, useState } from "react";
import FolderSelect from "~/components/FolderSelect";

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
                        Move File
                    </Flex>
                </Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Select a destination folder for <strong>{fileName}</strong>
                </Dialog.Description>

                <Flex direction="column" gap="3">
                    <div style={{
                        padding: "8px 12px",
                        backgroundColor: "var(--gray-3)",
                        borderRadius: "6px",
                        fontSize: "13px"
                    }}>
                        <Text size="1" color="gray">Current location:</Text>
                        <Text size="2" weight="medium" style={{ display: "block", marginTop: "2px" }}>
                            {displayFolder(currentFolder)}
                        </Text>
                    </div>

                    <div>
                        <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                            Move to:
                        </Text>
                        <FolderSelect
                            baseProject={baseProject}
                            value={selectedFolder}
                            onChange={setSelectedFolder}
                            excludePath={currentFolder}
                            allowCreate
                            disabled={isMoving}
                            placeholder="Select destination folder"
                        />
                    </div>

                    <Flex gap="3" mt="2" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" disabled={isMoving}>
                                Cancel
                            </Button>
                        </Dialog.Close>
                        <Button
                            onClick={handleMove}
                            disabled={!canMove || isMoving}
                        >
                            {isMoving ? "Moving..." : "Move"}
                        </Button>
                    </Flex>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
