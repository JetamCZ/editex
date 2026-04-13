import {Box, Button, Card, Flex, Heading, Text} from "@radix-ui/themes";
import {Link} from "react-router";
import {Lock, Users} from "lucide-react";
import type {Project} from "../../../../types/project";

interface Props {
    project: Project;
    canManageAccess: boolean;
}

export default function ProjectAccessCard({project, canManageAccess}: Props) {
    return (
        <Card className="w-full max-w-2xl mb-6">
            <Flex direction="column" gap="4">
                <Heading size="5">
                    <Lock className="h-5 w-5 inline mr-2" />
                    Access & Permissions
                </Heading>

                <Text size="2" color="gray">
                    Permissions are managed per folder. Grant a user VIEWER, EDITOR, or
                    MANAGER access on any folder, and that access cascades into every
                    subfolder beneath it.
                </Text>

                <Box>
                    <Flex align="center" gap="2">
                        <Users size={16} />
                        <Text size="2">
                            {canManageAccess
                                ? "You can grant or revoke access on any folder you manage."
                                : "Only managers can change permissions."}
                        </Text>
                    </Flex>
                </Box>

                <Flex gap="3">
                    <Button asChild>
                        <Link to={`/project/${project.baseProject}/${project.branch}/settings/permissions`}>
                            Manage permissions
                        </Link>
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
