import {useNavigate, useOutletContext} from "react-router";
import type {Project} from "../../../types/project";
import {FolderRole, roleIncludes} from "../../../types/permission";
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {
    Box,
    Text,
    Button,
    Flex,
    Heading,
} from "@radix-ui/themes";
import useAuth from "~/hooks/useAuth";
import {ProjectInfoCard, ProjectAccessCard, DangerZoneCard} from "./settings/index";

export function meta({ matches }: { matches: Array<{ data?: { project?: Project } }> }) {
    const parentData = matches.find(m => m.data?.project)?.data;
    const projectName = parentData?.project?.name || "Project";
    return [
        { title: `Settings - ${projectName} - Editex` },
    ];
}

interface OutletContextType {
    project: Project;
}

const ProjectSettingsPage = () => {
    const {project} = useOutletContext<OutletContextType>();
    const navigate = useNavigate();
    const {bearerToken} = useAuth();
    const [headerActionsContainer, setHeaderActionsContainer] = useState<HTMLElement | null>(null);

    const isOwner = project.userRole === FolderRole.MANAGER;
    const canManageAccess = roleIncludes(project.userRole, FolderRole.MANAGER);

    useEffect(() => {
        const container = document.getElementById('header-actions');
        setHeaderActionsContainer(container);
    }, []);

    const headerActions = headerActionsContainer && createPortal(
        <Button
            size="2"
            variant="soft"
            onClick={() => navigate(`/project/${project.baseProject}/${project.branch}`)}
        >
            Back to Editor
        </Button>,
        headerActionsContainer
    );

    return (
        <>
            {headerActions}

            <Box className="flex-1 bg-gray-1 overflow-auto">
                <Flex
                    direction="column"
                    align="center"
                    className="py-8 px-4"
                >
                    <Box className="w-full max-w-2xl mb-6">
                        <Heading size="8" mb="2">Project Settings</Heading>
                        <Text size="3" className="text-gray-11">
                            Manage your project settings and access
                        </Text>
                    </Box>

                    <ProjectInfoCard
                        project={project}
                        bearerToken={bearerToken}
                        isOwner={isOwner}
                    />

                    <ProjectAccessCard
                        project={project}
                        canManageAccess={canManageAccess}
                    />

                    {isOwner && (
                        <DangerZoneCard
                            project={project}
                            bearerToken={bearerToken}
                        />
                    )}
                </Flex>
            </Box>
        </>
    );
};

export default ProjectSettingsPage;
