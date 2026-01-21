import {useState} from "react";
import {
    Box,
    Text,
    Button,
    Card,
    Flex,
    Heading,
    TextField,
    Separator,
    Select,
    IconButton,
    Avatar,
} from "@radix-ui/themes";
import {Users, UserPlus, Trash2} from "lucide-react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import axios from "axios";
import type {ProjectMember} from "../../../../types/member";
import {Role} from "../../../../types/member";
import getInitials from "~/lib/getInitials";
import DeleteMemberDialog from "./DeleteMemberDialog";

interface TeamMembersCardProps {
    baseProject: string;
    initialMembers: ProjectMember[];
    bearerToken: string;
    isOwner: boolean;
}

function getRoleColor(role: Role) {
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
}

export default function TeamMembersCard({
    baseProject,
    initialMembers,
    bearerToken,
    isOwner,
}: TeamMembersCardProps) {
    const queryClient = useQueryClient();
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberRole, setNewMemberRole] = useState<Role>(Role.VIEWER);
    const [memberToDelete, setMemberToDelete] = useState<ProjectMember | null>(null);

    const {data: members = initialMembers, isLoading: loadingMembers} = useQuery({
        queryKey: ["projectMembers", baseProject],
        queryFn: async () => {
            const response = await axios.get<ProjectMember[]>(
                `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/projects/${baseProject}/members`,
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                    },
                }
            );
            return response.data;
        },
        initialData: initialMembers,
    });

    const inviteMutation = useMutation({
        mutationFn: async (data: {email: string; role: Role}) => {
            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/projects/${baseProject}/invitations`,
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
            queryClient.invalidateQueries({queryKey: ["projectMembers", baseProject]});
        },
    });

    const updateRoleMutation = useMutation({
        mutationFn: async (data: {userId: number; role: Role}) => {
            const response = await axios.put(
                `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/projects/${baseProject}/members/${data.userId}`,
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
            queryClient.invalidateQueries({queryKey: ["projectMembers", baseProject]});
        },
    });

    const removeMemberMutation = useMutation({
        mutationFn: async (userId: number) => {
            await axios.delete(
                `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/projects/${baseProject}/members/${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                    },
                }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["projectMembers", baseProject]});
            setMemberToDelete(null);
        },
    });

    const handleInviteMember = (e: React.FormEvent) => {
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

    return (
        <>
            <Card className="w-full max-w-2xl mb-6">
                <Flex direction="column" gap="4">
                    <Heading size="5">
                        <Users className="h-5 w-5 inline mr-2" />
                        Team Members
                    </Heading>

                    {isOwner && (
                        <>
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
                                                <Select.Trigger style={{width: 120}} />
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
                        </>
                    )}

                    <Box>
                        <Text size="2" weight="bold" mb="3" as="div">
                            Current members ({members.length})
                        </Text>

                        {loadingMembers ? (
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
                                        {isOwner ? (
                                            <>
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
                                            </>
                                        ) : (
                                            <Text size="2" weight="bold" color={getRoleColor(member.role)}>
                                                {member.role}
                                            </Text>
                                        )}
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
                </Flex>
            </Card>

            <DeleteMemberDialog
                member={memberToDelete}
                onClose={() => setMemberToDelete(null)}
                onConfirm={handleRemoveMember}
                isPending={removeMemberMutation.isPending}
                error={removeMemberMutation.error}
            />
        </>
    );
}
