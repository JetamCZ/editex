import {useState} from "react";
import {
    Box,
    Text,
    Button,
    Flex,
    TextField,
    AlertDialog,
} from "@radix-ui/themes";
import type {Project} from "../../../../types/project";

interface DeleteProjectDialogProps {
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
    error: Error | null;
}

export default function DeleteProjectDialog({
    project,
    open,
    onOpenChange,
    onConfirm,
    isPending,
    error,
}: DeleteProjectDialogProps) {
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    const handleConfirm = () => {
        if (deleteConfirmation === project.name) {
            onConfirm();
        }
    };

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Content style={{maxWidth: 450}}>
                <AlertDialog.Title>Delete Project</AlertDialog.Title>
                <AlertDialog.Description size="2">
                    This action cannot be undone. This will permanently delete the project
                    <strong> {project.name}</strong> and all its files.
                </AlertDialog.Description>

                <Box mt="4">
                    <Text size="2" mb="2" as="div">
                        Please type <strong>{project.name}</strong> to confirm:
                    </Text>
                    <TextField.Root
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder={project.name}
                    />
                </Box>

                {error && (
                    <Text color="red" size="2" mt="2">
                        {(error as any)?.response?.data?.message || "Failed to delete project"}
                    </Text>
                )}

                <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                        <Button variant="soft" color="gray">
                            Cancel
                        </Button>
                    </AlertDialog.Cancel>
                    <Button
                        variant="solid"
                        color="red"
                        onClick={handleConfirm}
                        disabled={deleteConfirmation !== project.name || isPending}
                    >
                        {isPending ? "Deleting..." : "Delete Project"}
                    </Button>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
