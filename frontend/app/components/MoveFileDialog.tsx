import { Dialog, Button, Flex, Text, RadioGroup } from "@radix-ui/themes";
import { Folder, FolderPlus } from "lucide-react";
import { useState } from "react";

interface MoveFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileName: string;
    currentFolder: string;
    folders: string[];
    onMove: (targetFolder: string) => void;
    isMoving?: boolean;
}

export default function MoveFileDialog({
    open,
    onOpenChange,
    fileName,
    currentFolder,
    folders,
    onMove,
    isMoving = false,
}: MoveFileDialogProps) {
    const [selectedFolder, setSelectedFolder] = useState<string>(currentFolder);
    const [newFolderName, setNewFolderName] = useState("");
    const [showNewFolder, setShowNewFolder] = useState(false);

    const handleMove = () => {
        if (showNewFolder && newFolderName.trim()) {
            // Create new folder path
            const newFolder = "/" + newFolderName.trim().replace(/^\/+|\/+$/g, '');
            onMove(newFolder);
        } else if (selectedFolder && selectedFolder !== currentFolder) {
            onMove(selectedFolder);
        }
    };

    const handleClose = () => {
        if (!isMoving) {
            setSelectedFolder(currentFolder);
            setNewFolderName("");
            setShowNewFolder(false);
            onOpenChange(false);
        }
    };

    const canMove = showNewFolder
        ? newFolderName.trim().length > 0
        : selectedFolder !== currentFolder;

    // Get display name for folder
    const getFolderDisplayName = (folder: string) => {
        if (folder === "/") return "Root";
        return folder.replace(/^\//, "");
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
                    {/* Current location */}
                    <div style={{
                        padding: "8px 12px",
                        backgroundColor: "var(--gray-3)",
                        borderRadius: "6px",
                        fontSize: "13px"
                    }}>
                        <Text size="1" color="gray">Current location:</Text>
                        <Text size="2" weight="medium" style={{ display: "block", marginTop: "2px" }}>
                            {getFolderDisplayName(currentFolder)}
                        </Text>
                    </div>

                    {/* Folder selection */}
                    <div>
                        <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                            Move to:
                        </Text>
                        <RadioGroup.Root
                            value={showNewFolder ? "__new__" : selectedFolder}
                            onValueChange={(value) => {
                                if (value === "__new__") {
                                    setShowNewFolder(true);
                                } else {
                                    setShowNewFolder(false);
                                    setSelectedFolder(value);
                                }
                            }}
                        >
                            <Flex direction="column" gap="2">
                                {folders
                                    .filter(f => f !== currentFolder)
                                    .map((folder) => (
                                        <label
                                            key={folder}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                padding: "8px 12px",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                backgroundColor: selectedFolder === folder && !showNewFolder
                                                    ? "var(--blue-3)"
                                                    : "var(--gray-2)",
                                                border: selectedFolder === folder && !showNewFolder
                                                    ? "1px solid var(--blue-6)"
                                                    : "1px solid transparent"
                                            }}
                                        >
                                            <RadioGroup.Item value={folder} />
                                            <Folder size={16} />
                                            <Text size="2">{getFolderDisplayName(folder)}</Text>
                                        </label>
                                    ))}

                                {/* Option to create new folder */}
                                <label
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        backgroundColor: showNewFolder ? "var(--blue-3)" : "var(--gray-2)",
                                        border: showNewFolder ? "1px solid var(--blue-6)" : "1px solid transparent"
                                    }}
                                >
                                    <RadioGroup.Item value="__new__" />
                                    <FolderPlus size={16} />
                                    <Text size="2">Create new folder</Text>
                                </label>
                            </Flex>
                        </RadioGroup.Root>

                        {/* New folder input */}
                        {showNewFolder && (
                            <div style={{ marginTop: "12px" }}>
                                <Text size="1" color="gray" mb="1" style={{ display: "block" }}>
                                    New folder name:
                                </Text>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="e.g., images, sections"
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid var(--gray-6)",
                                        fontSize: "14px"
                                    }}
                                    autoFocus
                                />
                            </div>
                        )}
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
