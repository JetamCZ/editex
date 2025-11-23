import {Avatar, Badge, Box, Flex, HoverCard, Text} from "@radix-ui/themes";
import type {Project} from "../../../types/project";
import type {ProjectMember} from "../../../types/member";
import getInitials from "~/lib/getInitials";
import InviteMemberModal from "./invite-member-modal";
import {useRevalidator} from "react-router";

interface ProjectMembersProps {
    project: Project;
    members: ProjectMember[];
}

export default function ProjectMembers({project, members}: ProjectMembersProps) {
    const revalidator = useRevalidator();

    const handleInviteSuccess = () => {
        revalidator.revalidate();
    };

    return (
        <Flex
            direction="column"
            gap="3"
            className="px-6 py-4 border-b border-gray-a6"
        >
            <Box>
                <Text size="2">
                    project:
                </Text> <br/>
                <Text size="3" weight="bold">
                    {project.name}
                </Text>
            </Box>

            <Box>
                <Flex justify="between" align="center" mb="2">
                    <Text size="2">
                        members:
                    </Text>
                    <InviteMemberModal
                        projectId={project.id}
                        onSuccess={handleInviteSuccess}
                    />
                </Flex>
                <Flex gap="1" align="center">
                    {members.map((member) => (
                        <HoverCard.Root key={member.id}>
                            <HoverCard.Trigger>
                                <div style={{display: "inline-block"}}>
                                    <Avatar
                                        size="2"
                                        fallback={getInitials(member.userName)}
                                        radius="full"
                                        color="indigo"
                                        variant="soft"
                                        style={{cursor: "pointer"}}
                                    />
                                </div>
                            </HoverCard.Trigger>
                            <HoverCard.Content size="1" style={{maxWidth: 300}}>
                                <Flex direction="column" gap="2">
                                    <Flex align="center" gap="2">
                                        <Avatar
                                            size="3"
                                            fallback={getInitials(member.userName)}
                                            radius="full"
                                            color="indigo"
                                        />
                                        <Box>
                                            <Text as="div" size="2" weight="bold">
                                                {member.userName}
                                            </Text>
                                            <Text as="div" size="1" color="gray">
                                                {member.userEmail}
                                            </Text>
                                        </Box>
                                    </Flex>
                                    <div>
                                        <Badge
                                            variant="soft"
                                            color={
                                                member.role === "OWNER"
                                                    ? "blue"
                                                    : member.role === "EDITOR"
                                                        ? "green"
                                                        : "gray"
                                            }
                                        >
                                            {member.role}
                                        </Badge>
                                    </div>
                                </Flex>
                            </HoverCard.Content>
                        </HoverCard.Root>
                    ))}
                </Flex>
            </Box>
        </Flex>
    );
}
