import {useState} from "react";
import { useTranslation } from 'react-i18next';
import {
    Box,
    Text,
    Button,
    Card,
    Flex,
    Heading,
    TextField,
    Separator,
    IconButton,
    Callout,
} from "@radix-ui/themes";
import {Pencil1Icon, CheckCircledIcon, ExclamationTriangleIcon} from "@radix-ui/react-icons";
import {useMutation} from "@tanstack/react-query";
import axios from "axios";
import type {Project} from "../../../../types/project";
import {FolderRole} from "../../../../types/permission";

interface ProjectInfoCardProps {
    project: Project;
    bearerToken: string;
    isOwner: boolean;
}

function getRoleColor(role: FolderRole | null | undefined) {
    switch (role) {
        case FolderRole.MANAGER:
            return "blue";
        case FolderRole.EDITOR:
            return "green";
        case FolderRole.VIEWER:
            return "gray";
        default:
            return "gray";
    }
}

export default function ProjectInfoCard({project, bearerToken, isOwner}: ProjectInfoCardProps) {
    const { t } = useTranslation();
    const [projectName, setProjectName] = useState(project.name);
    const [isEditingName, setIsEditingName] = useState(false);

    const updateProjectMutation = useMutation({
        mutationFn: async (name: string) => {
            const response = await axios.put(
                `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/projects/${project.baseProject}/${project.branch}`,
                {name},
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                    },
                }
            );
            return response.data;
        },
        onSuccess: () => {
            setIsEditingName(false);
        },
    });

    const handleSaveProjectName = () => {
        if (projectName.trim() && projectName !== project.name) {
            updateProjectMutation.mutate(projectName.trim());
        } else {
            setIsEditingName(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mb-6">
            <Flex direction="column" gap="4">
                <Heading size="5">{t('settings.projectInfo.heading')}</Heading>

                {updateProjectMutation.isSuccess && (
                    <Callout.Root color="green">
                        <Callout.Icon>
                            <CheckCircledIcon />
                        </Callout.Icon>
                        <Callout.Text>{t('settings.projectInfo.updateSuccess')}</Callout.Text>
                    </Callout.Root>
                )}

                {updateProjectMutation.isError && (
                    <Callout.Root color="red">
                        <Callout.Icon>
                            <ExclamationTriangleIcon />
                        </Callout.Icon>
                        <Callout.Text>
                            {(updateProjectMutation.error as any)?.response?.data?.message || "Failed to update project name"}
                        </Callout.Text>
                    </Callout.Root>
                )}

                <Box>
                    <Text as="label" size="2" weight="bold" mb="2" className="block">
                        {t('settings.projectInfo.nameLabel')}
                    </Text>
                    {isEditingName ? (
                        <Flex gap="2">
                            <TextField.Root
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder={t('settings.projectInfo.namePlaceholder')}
                                size="3"
                                style={{flex: 1}}
                            />
                            <Button
                                onClick={handleSaveProjectName}
                                disabled={updateProjectMutation.isPending}
                            >
                                {updateProjectMutation.isPending ? t('settings.projectInfo.saving') : t('settings.projectInfo.save')}
                            </Button>
                            <Button
                                variant="soft"
                                color="gray"
                                onClick={() => {
                                    setProjectName(project.name);
                                    setIsEditingName(false);
                                }}
                            >
                                {t('settings.projectInfo.cancel')}
                            </Button>
                        </Flex>
                    ) : (
                        <Flex align="center" gap="2">
                            <Text size="3">{projectName}</Text>
                            {isOwner && (
                                <IconButton
                                    size="1"
                                    variant="ghost"
                                    onClick={() => setIsEditingName(true)}
                                >
                                    <Pencil1Icon />
                                </IconButton>
                            )}
                        </Flex>
                    )}
                </Box>

                <Separator size="4" />

                <Flex direction="column" gap="2">
                    <Flex justify="between" align="center">
                        <Text size="2" className="text-gray-11">{t('settings.projectInfo.projectId')}</Text>
                        <Text size="2" style={{fontFamily: "monospace"}}>{project.baseProject}</Text>
                    </Flex>
                    <Flex justify="between" align="center">
                        <Text size="2" className="text-gray-11">{t('settings.projectInfo.branch')}</Text>
                        <Text size="2" style={{fontFamily: "monospace"}}>{project.branch}</Text>
                    </Flex>
                    <Flex justify="between" align="center">
                        <Text size="2" className="text-gray-11">{t('settings.projectInfo.yourRole')}</Text>
                        <Text size="2" weight="bold" color={getRoleColor(project.userRole)}>
                            {project.userRole ?? "—"}
                        </Text>
                    </Flex>
                    <Flex justify="between" align="center">
                        <Text size="2" className="text-gray-11">{t('settings.projectInfo.created')}</Text>
                        <Text size="2">{new Date(project.createdAt).toLocaleDateString()}</Text>
                    </Flex>
                </Flex>
            </Flex>
        </Card>
    );
}
