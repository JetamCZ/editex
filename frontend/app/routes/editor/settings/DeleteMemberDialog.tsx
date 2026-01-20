import {
    Text,
    Button,
    Flex,
    AlertDialog,
} from "@radix-ui/themes";
import type {ProjectMember} from "../../../../types/member";

interface DeleteMemberDialogProps {
    member: ProjectMember | null;
    onClose: () => void;
    onConfirm: () => void;
    isPending: boolean;
    error: Error | null;
}

export default function DeleteMemberDialog({
    member,
    onClose,
    onConfirm,
    isPending,
    error,
}: DeleteMemberDialogProps) {
    return (
        <AlertDialog.Root open={!!member} onOpenChange={(open) => !open && onClose()}>
            <AlertDialog.Content style={{maxWidth: 450}}>
                <AlertDialog.Title>Remove member</AlertDialog.Title>
                <AlertDialog.Description size="2">
                    Are you sure you want to remove <strong>{member?.userName}</strong> from this project?
                    This action cannot be undone.
                </AlertDialog.Description>

                {error && (
                    <Text color="red" size="2" mt="2">
                        {(error as any)?.response?.data?.message || "Failed to remove member"}
                    </Text>
                )}

                <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                        <Button variant="soft" color="gray">
                            Cancel
                        </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                        <Button
                            variant="solid"
                            color="red"
                            onClick={onConfirm}
                            disabled={isPending}
                        >
                            {isPending ? "Removing..." : "Remove member"}
                        </Button>
                    </AlertDialog.Action>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
