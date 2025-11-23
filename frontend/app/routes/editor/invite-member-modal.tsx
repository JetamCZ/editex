import {useState} from "react";
import {
    Dialog,
    Flex,
    Text,
    TextField,
    Button,
    Select,
} from "@radix-ui/themes";
import {Role} from "../../../types/member";
import axios from "axios";
import useAuth from "~/hooks/useAuth";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {UserPlus} from "lucide-react";

interface InviteMemberModalProps {
    projectId: string;
    onSuccess?: () => void;
}

interface InviteMemberData {
    email: string;
    role: Role;
}

export default function InviteMemberModal({
    projectId,
    onSuccess,
}: InviteMemberModalProps) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<Role>(Role.VIEWER);
    const queryClient = useQueryClient();
    const {bearerToken} = useAuth();

    const inviteMutation = useMutation({
        mutationFn: async (data: InviteMemberData) => {
            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/projects/${projectId}/invitations`,
                data,
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                    },
                }
            );
            return response.data;
        },
        onSuccess: () => {
            setEmail("");
            setRole(Role.VIEWER);
            setOpen(false);
            queryClient.invalidateQueries({queryKey: ["projectMembers", projectId]});
            onSuccess?.();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        inviteMutation.mutate({email, role});
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger>
                <Button size="1" variant="soft">
                    <UserPlus className="h-4"/> Add member
                </Button>
            </Dialog.Trigger>

            <Dialog.Content style={{maxWidth: 450}}>
                <Dialog.Title>Invite member to project</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Send an invitation to collaborate on this project
                </Dialog.Description>

                <form onSubmit={handleSubmit}>
                    <Flex direction="column" gap="3">
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                Email
                            </Text>
                            <TextField.Root
                                placeholder="Enter email address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </label>

                        <label>
                            <Text as="div" size="2" mb="1" weight="bold">
                                Role
                            </Text>
                            <Select.Root
                                value={role}
                                onValueChange={(value) => setRole(value as Role)}
                            >
                                <Select.Trigger />
                                <Select.Content>
                                    <Select.Item value={Role.VIEWER}>
                                        Viewer - Can view the project
                                    </Select.Item>
                                    <Select.Item value={Role.EDITOR}>
                                        Editor - Can edit the project
                                    </Select.Item>
                                    <Select.Item value={Role.OWNER}>
                                        Owner - Full access
                                    </Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </label>

                        {inviteMutation.isError && (
                            <Text color="red" size="2">
                                {(inviteMutation.error as any)?.response?.data?.message || "Failed to send invitation"}
                            </Text>
                        )}

                        <Flex gap="3" mt="4" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray" type="button">
                                    Cancel
                                </Button>
                            </Dialog.Close>
                            <Button type="submit" disabled={inviteMutation.isPending}>
                                {inviteMutation.isPending ? "Sending..." : "Send invitation"}
                            </Button>
                        </Flex>
                    </Flex>
                </form>
            </Dialog.Content>
        </Dialog.Root>
    );
}
