import {useState} from "react";
import {
    Box,
    Text,
    Button,
    Flex,
    TextField,
    AlertDialog,
} from "@radix-ui/themes";
import type {Project} from "../../../../types/project";
import { useTranslation } from 'react-i18next';

interface DeleteProjectDialogProps {
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
    error: Error | null;
}

export default function DeleteProjectDialog({
    project,
    open,
    onOpenChange,
    onConfirm,
    isPending,
    error,
}: DeleteProjectDialogProps) {
    const { t } = useTranslation();
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    const handleConfirm = () => {
        if (deleteConfirmation === project.name) {
            onConfirm();
        }
    };

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Content style={{maxWidth: 450}}>
                <AlertDialog.Title>{t('settings.deleteProject.title')}</AlertDialog.Title>
                <AlertDialog.Description size="2">
                    {t('settings.deleteProject.description', { name: project.name })}
                </AlertDialog.Description>

                <Box mt="4">
                    <Text size="2" mb="2" as="div">
                        {t('settings.deleteProject.confirmPrompt', { name: project.name })}
                    </Text>
                    <TextField.Root
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder={project.name}
                    />
                </Box>

                {error && (
                    <Text color="red" size="2" mt="2">
                        {(error as any)?.response?.data?.message || t('settings.deleteProject.errorFallback')}
                    </Text>
                )}

                <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                        <Button variant="soft" color="gray">
                            {t('settings.deleteProject.cancel')}
                        </Button>
                    </AlertDialog.Cancel>
                    <Button
                        variant="solid"
                        color="red"
                        onClick={handleConfirm}
                        disabled={deleteConfirmation !== project.name || isPending}
                    >
                        {isPending ? t('settings.deleteProject.deleting') : t('settings.deleteProject.submit')}
                    </Button>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
