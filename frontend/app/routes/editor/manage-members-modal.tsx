import {useState} from "react";
import {
    Dialog,
    Flex,
    Text,
    TextField,
    Button,
    Select,
    Box,
    Avatar,
    IconButton,
    Separator,
    AlertDialog,
} from "@radix-ui/themes";
import {Role} from "../../../types/member";
import type {ProjectMember} from "../../../types/member";
import axios from "axios";
import useAuth from "~/hooks/useAuth";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Users, UserPlus, Trash2} from "lucide-react";
import getInitials from "~/lib/getInitials";

interface ManageMembersModalProps {
    projectId: string;
    onSuccess?: () => void;
}

interface InviteMemberData {
    email: string;
    role: Role;
}

interface UpdateMemberRoleData {
    userId: number;
    role: Role;
}

export default function ManageMembersModal({
    projectId,
    onSuccess,
}: ManageMembersModalProps) {
    const [open, setOpen] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberRole, setNewMemberRole] = useState<Role>(Role.VIEWER);
    const [memberToDelete, setMemberToDelete] = useState<ProjectMember | null>(null);
    const queryClient = useQueryClient();
    const {bearerToken} = useAuth();

    // Fetch current members
    const {data: members = [], isLoading} = useQuery({
        queryKey: ["projectMembers", projectId],
        queryFn: async () => {
            const response = await axios.get<ProjectMember[]>(
                `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/projects/${projectId}/members`,
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                    },
                }
            );
            return response.data;
        },
        enabled: open,
    });

    // Invite member mutation
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
            setNewMemberEmail("");
            setNewMemberRole(Role.VIEWER);
            queryClient.invalidateQueries({queryKey: ["projectMembers", projectId]});
            onSuccess?.();
        },
    });

    // Update member role mutation
    const updateRoleMutation = useMutation({
        mutationFn: async (data: UpdateMemberRoleData) => {
            const response = await axios.put(
                `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/projects/${projectId}/members/${data.userId}`,
                {role: data.role},
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                    },
                }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["projectMembers", projectId]});
            onSuccess?.();
        },
    });

    // Remove member mutation
    const removeMemberMutation = useMutation({
        mutationFn: async (userId: number) => {
            await axios.delete(
                `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/projects/${projectId}/members/${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                    },
                }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["projectMembers", projectId]});
            setMemberToDelete(null);
            onSuccess?.();
        },
    });

    const handleInviteMember = async (e: React.FormEvent) => {
        e.preventDefault();
        inviteMutation.mutate({email: newMemberEmail, role: newMemberRole});
    };

    const handleRoleChange = (userId: number, newRole: Role) => {
        updateRoleMutation.mutate({userId, role: newRole});
    };

    const handleRemoveMember = () => {
        if (memberToDelete) {
            removeMemberMutation.mutate(memberToDelete.userId);
        }
    };

    const getRoleColor = (role: Role) => {
        switch (role) {
            case Role.OWNER:
                return "blue";
            case Role.EDITOR:
                return "green";
            case Role.VIEWER:
                return "gray";
            default:
                return "gray";
        }
    };

    return (
        <>
            <Dialog.Root open={open} onOpenChange={setOpen}>
                <Dialog.Trigger>
                    <Button size="1" variant="soft">
                         Manage <Users className="h-4" />
                    </Button>
                </Dialog.Trigger>

                <Dialog.Content style={{maxWidth: 600}}>
                    <Dialog.Title>Manage project members</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Add, remove, or change roles of project members
                    </Dialog.Description>

                    <Flex direction="column" gap="4">
                        {/* Add new member section */}
                        <Box>
                            <Text size="2" weight="bold" mb="2" as="div">
                                <UserPlus className="h-3 inline mr-1" />
                                Invite new member
                            </Text>
                            <form onSubmit={handleInviteMember}>
                                <Flex direction="column" gap="3">
                                    <Flex gap="2">
                                        <Box style={{flex: 1}}>
                                            <TextField.Root
                                                placeholder="Enter email address"
                                                type="email"
                                                value={newMemberEmail}
                                                onChange={(e) => setNewMemberEmail(e.target.value)}
                                                required
                                            />
                                        </Box>
                                        <Select.Root
                                            value={newMemberRole}
                                            onValueChange={(value) => setNewMemberRole(value as Role)}
                                        >
                                            <Select.Trigger style={{width: 150}} />
                                            <Select.Content>
                                                <Select.Item value={Role.VIEWER}>Viewer</Select.Item>
                                                <Select.Item value={Role.EDITOR}>Editor</Select.Item>
                                                <Select.Item value={Role.OWNER}>Owner</Select.Item>
                                            </Select.Content>
                                        </Select.Root>
                                        <Button type="submit" disabled={inviteMutation.isPending}>
                                            {inviteMutation.isPending ? "Inviting..." : "Invite"}
                                        </Button>
                                    </Flex>

                                    {inviteMutation.isError && (
                                        <Text color="red" size="2">
                                            {(inviteMutation.error as any)?.response?.data?.message || "Failed to send invitation"}
                                        </Text>
                                    )}
                                    {inviteMutation.isSuccess && (
                                        <Text color="green" size="2">
                                            Invitation sent successfully!
                                        </Text>
                                    )}
                                </Flex>
                            </form>
                        </Box>

                        <Separator size="4" />

                        {/* Current members list */}
                        <Box>
                            <Text size="2" weight="bold" mb="3" as="div">
                                Current members ({members.length})
                            </Text>

                            {isLoading ? (
                                <Text size="2" color="gray">Loading members...</Text>
                            ) : members.length === 0 ? (
                                <Text size="2" color="gray">No members found</Text>
                            ) : (
                                <Flex direction="column" gap="2">
                                    {members.map((member) => (
                                        <Flex
                                            key={member.id}
                                            align="center"
                                            gap="3"
                                            p="2"
                                            className="border border-gray-a6 rounded"
                                        >
                                            <Avatar
                                                size="2"
                                                fallback={getInitials(member.userName)}
                                                radius="full"
                                                color="indigo"
                                                variant="soft"
                                            />
                                            <Box style={{flex: 1}}>
                                                <Text as="div" size="2" weight="bold">
                                                    {member.userName}
                                                </Text>
                                                <Text as="div" size="1" color="gray">
                                                    {member.userEmail}
                                                </Text>
                                            </Box>
                                            <Select.Root
                                                value={member.role}
                                                onValueChange={(value) => handleRoleChange(member.userId, value as Role)}
                                            >
                                                <Select.Trigger
                                                    style={{width: 120}}
                                                    color={getRoleColor(member.role)}
                                                />
                                                <Select.Content>
                                                    <Select.Item value={Role.VIEWER}>Viewer</Select.Item>
                                                    <Select.Item value={Role.EDITOR}>Editor</Select.Item>
                                                    <Select.Item value={Role.OWNER}>Owner</Select.Item>
                                                </Select.Content>
                                            </Select.Root>
                                            <IconButton
                                                size="2"
                                                variant="soft"
                                                color="red"
                                                onClick={() => setMemberToDelete(member)}
                                            >
                                                <Trash2 className="h-4" />
                                            </IconButton>
                                        </Flex>
                                    ))}
                                </Flex>
                            )}

                            {updateRoleMutation.isError && (
                                <Text color="red" size="2" mt="2">
                                    {(updateRoleMutation.error as any)?.response?.data?.message || "Failed to update role"}
                                </Text>
                            )}
                        </Box>

                        <Flex gap="3" mt="2" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">
                                    Close
                                </Button>
                            </Dialog.Close>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Delete confirmation dialog */}
            <AlertDialog.Root open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
                <AlertDialog.Content style={{maxWidth: 450}}>
                    <AlertDialog.Title>Remove member</AlertDialog.Title>
                    <AlertDialog.Description size="2">
                        Are you sure you want to remove <strong>{memberToDelete?.userName}</strong> from this project?
                        This action cannot be undone.
                    </AlertDialog.Description>

                    {removeMemberMutation.isError && (
                        <Text color="red" size="2" mt="2">
                            {(removeMemberMutation.error as any)?.response?.data?.message || "Failed to remove member"}
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
                                onClick={handleRemoveMember}
                                disabled={removeMemberMutation.isPending}
                            >
                                {removeMemberMutation.isPending ? "Removing..." : "Remove member"}
                            </Button>
                        </AlertDialog.Action>
                    </Flex>
                </AlertDialog.Content>
            </AlertDialog.Root>
        </>
    );
}
