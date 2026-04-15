import {Box, Button, Card, Flex, Heading, Text} from "@radix-ui/themes";
import {Link} from "react-router";
import {Lock, Users} from "lucide-react";
import type {Project} from "../../../../types/project";
import { useTranslation } from 'react-i18next';

interface Props {
    project: Project;
    canManageAccess: boolean;
}

export default function ProjectAccessCard({project, canManageAccess}: Props) {
    const { t } = useTranslation();
    return (
        <Card className="w-full max-w-2xl mb-6">
            <Flex direction="column" gap="4">
                <Heading size="5">
                    <Lock className="h-5 w-5 inline mr-2" />
                    {t('settings.access.heading')}
                </Heading>

                <Text size="2" color="gray">
                    {t('settings.access.description')}
                </Text>

                <Box>
                    <Flex align="center" gap="2">
                        <Users size={16} />
                        <Text size="2">
                            {canManageAccess
                                ? t('settings.access.canManage')
                                : t('settings.access.onlyManagers')}
                        </Text>
                    </Flex>
                </Box>

                <Flex gap="3">
                    <Button asChild>
                        <Link to={`/project/${project.baseProject}/settings/permissions`}>
                            {t('settings.access.manageButton')}
                        </Link>
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
