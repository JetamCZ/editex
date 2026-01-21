import { Dialog, Button, Flex, Text, TextField } from "@radix-ui/themes";
import { useState } from "react";
import { useCreateBranch } from "~/hooks/useBranches";
import { GitBranch } from "lucide-react";

interface CreateBranchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    baseProject: string;
    currentBranch: string;
    onBranchCreated?: (branchName: string) => void;
}

export default function CreateBranchDialog({
    open,
    onOpenChange,
    baseProject,
    currentBranch,
    onBranchCreated,
}: CreateBranchDialogProps) {
    const [branchName, setBranchName] = useState("");
    const createBranchMutation = useCreateBranch();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!branchName.trim()) return;

        createBranchMutation.mutate(
            {
                baseProject,
                branchName: branchName.trim(),
                sourceBranch: currentBranch,
            },
            {
                onSuccess: () => {
                    setBranchName("");
                    onOpenChange(false);
                    onBranchCreated?.(branchName.trim());
                },
            }
        );
    };

    const handleClose = () => {
        if (!createBranchMutation.isPending) {
            setBranchName("");
            createBranchMutation.reset();
            onOpenChange(false);
        }
    };

    const isValidBranchName = /^[a-zA-Z0-9_-]+$/.test(branchName);
    const canSubmit = branchName.trim() && isValidBranchName && !createBranchMutation.isPending;

    return (
        <Dialog.Root open={open} onOpenChange={handleClose}>
            <Dialog.Content maxWidth="400px">
                <Dialog.Title>
                    <Flex align="center" gap="2">
                        <GitBranch className="h-5 w-5" />
                        Create New Branch
                    </Flex>
                </Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Create a new branch from "{currentBranch}". All files will be copied to the new branch.
                </Dialog.Description>

                <form onSubmit={handleSubmit}>
                    <Flex direction="column" gap="3">
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                Branch Name
                            </Text>
                            <TextField.Root
                                placeholder="e.g., feature-intro, draft-v2"
                                value={branchName}
                                onChange={(e) => setBranchName(e.target.value)}
                                disabled={createBranchMutation.isPending}
                            />
                            {branchName && !isValidBranchName && (
                                <Text size="1" color="red" mt="1">
                                    Only letters, numbers, underscores, and hyphens allowed
                                </Text>
                            )}
                        </label>

                        {createBranchMutation.isError && (
                            <Text size="2" color="red">
                                {(createBranchMutation.error as any)?.response?.data?.message ||
                                    "Failed to create branch"}
                            </Text>
                        )}

                        <Flex gap="3" mt="2" justify="end">
                            <Dialog.Close>
                                <Button
                                    variant="soft"
                                    color="gray"
                                    type="button"
                                    disabled={createBranchMutation.isPending}
                                >
                                    Cancel
                                </Button>
                            </Dialog.Close>
                            <Button type="submit" disabled={!canSubmit}>
                                {createBranchMutation.isPending ? "Creating..." : "Create Branch"}
                            </Button>
                        </Flex>
                    </Flex>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    );
}
