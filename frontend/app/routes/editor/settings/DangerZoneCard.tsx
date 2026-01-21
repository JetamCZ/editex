import {useState} from "react";
import {useNavigate} from "react-router";
import {
    Box,
    Text,
    Button,
    Card,
    Flex,
    Heading,
} from "@radix-ui/themes";
import {useMutation} from "@tanstack/react-query";
import axios from "axios";
import type {Project} from "../../../../types/project";
import DeleteProjectDialog from "./DeleteProjectDialog";

interface DangerZoneCardProps {
    project: Project;
    bearerToken: string;
}

export default function DangerZoneCard({project, bearerToken}: DangerZoneCardProps) {
    const navigate = useNavigate();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const deleteProjectMutation = useMutation({
        mutationFn: async () => {
            await axios.delete(
                `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/projects/${project.baseProject}/${project.branch}`,
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                    },
                }
            );
        },
        onSuccess: () => {
            navigate("/dashboard");
        },
    });

    return (
        <>
            <Card className="w-full max-w-2xl border-red-6">
                <Flex direction="column" gap="4">
                    <Heading size="5" className="text-red-11">Danger Zone</Heading>
                    <Flex justify="between" align="center">
                        <Flex direction="column" gap="1">
                            <Text size="2" weight="bold">Delete Project</Text>
                            <Text size="2" className="text-gray-11">
                                Permanently delete this project and all its files
                            </Text>
                        </Flex>
                        <Button
                            variant="soft"
                            color="red"
                            size="2"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            Delete Project
                        </Button>
                    </Flex>
                </Flex>
            </Card>

            <DeleteProjectDialog
                project={project}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={() => deleteProjectMutation.mutate()}
                isPending={deleteProjectMutation.isPending}
                error={deleteProjectMutation.error}
            />
        </>
    );
}
