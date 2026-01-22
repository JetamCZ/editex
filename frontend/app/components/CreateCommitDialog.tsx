import { Dialog, Button, Flex, Text, TextArea } from "@radix-ui/themes";
import { useState } from "react";
import { useCreateCommit } from "~/hooks/useCommits";
import { Tag } from "lucide-react";

interface CreateCommitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    baseProject: string;
    currentBranch: string;
    onCommitCreated?: () => void;
}

export default function CreateCommitDialog({
    open,
    onOpenChange,
    baseProject,
    currentBranch,
    onCommitCreated,
}: CreateCommitDialogProps) {
    const [message, setMessage] = useState("");
    const createCommitMutation = useCreateCommit();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        createCommitMutation.mutate(
            {
                baseProject,
                message: message.trim(),
                branch: currentBranch,
            },
            {
                onSuccess: () => {
                    setMessage("");
                    onOpenChange(false);
                    onCommitCreated?.();
                },
            }
        );
    };

    const handleClose = () => {
        if (!createCommitMutation.isPending) {
            setMessage("");
            createCommitMutation.reset();
            onOpenChange(false);
        }
    };

    const canSubmit = message.trim().length > 0 && !createCommitMutation.isPending;

    return (
        <Dialog.Root open={open} onOpenChange={handleClose}>
            <Dialog.Content maxWidth="450px">
                <Dialog.Title>
                    <Flex align="center" gap="2">
                        <Tag className="h-5 w-5" />
                        Create Version Label
                    </Flex>
                </Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Create a labeled snapshot of the current state on branch "{currentBranch}".
                    This helps you track and identify important versions of your document.
                </Dialog.Description>

                <form onSubmit={handleSubmit}>
                    <Flex direction="column" gap="3">
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                Version Message
                            </Text>
                            <TextArea
                                placeholder="e.g., Draft ready for review, Final submission, Added introduction section"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={createCommitMutation.isPending}
                                rows={3}
                            />
                            <Text size="1" color="gray" mt="1">
                                Describe what this version represents or what changes were made
                            </Text>
                        </label>

                        {createCommitMutation.isError && (
                            <Text size="2" color="red">
                                {(createCommitMutation.error as any)?.response?.data?.message ||
                                    "Failed to create version"}
                            </Text>
                        )}

                        <Flex gap="3" mt="2" justify="end">
                            <Dialog.Close>
                                <Button
                                    variant="soft"
                                    color="gray"
                                    type="button"
                                    disabled={createCommitMutation.isPending}
                                >
                                    Cancel
                                </Button>
                            </Dialog.Close>
                            <Button type="submit" disabled={!canSubmit} color="green">
                                {createCommitMutation.isPending ? "Creating..." : "Create Version"}
                            </Button>
                        </Flex>
                    </Flex>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    );
}
