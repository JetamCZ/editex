import { Dialog, Button, Flex, Text, Box, TextField, Select } from "@radix-ui/themes";
import { useState } from "react";
import axios from "axios";
import useAuth from "~/hooks/useAuth";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import FolderSelect from "~/components/FolderSelect";
import { useTranslation } from 'react-i18next';

interface CreateFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
}


export default function CreateFileModal({
  open,
  onOpenChange,
  projectId,
}: CreateFileModalProps) {
  const { t } = useTranslation();
  const { bearerToken } = useAuth();
  const queryClient = useQueryClient();

  const [fileName, setFileName] = useState("");
  const [fileExtension, setFileExtension] = useState("tex");
  const [folder, setFolder] = useState("/");
  const [error, setError] = useState<string | null>(null);

  const createFileMutation = useMutation({
    mutationFn: async () => {
      const fullFileName = fileName.includes('.') ? fileName : `${fileName}.${fileExtension}`;

      const blob = new Blob([""], { type: 'text/plain' });
      const file = new File([blob], fullFileName, { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', String(projectId));
      formData.append('folder', folder);

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/files/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${bearerToken}`
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectFolders', projectId] });
      handleClose();
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || 'Failed to create file');
      } else {
        setError('Failed to create file');
      }
    }
  });

  const handleClose = () => {
    if (!createFileMutation.isPending) {
      setFileName("");
      setFileExtension("tex");
      setFolder("/");
      setError(null);
      createFileMutation.reset();
      onOpenChange(false);
    }
  };

  const handleCreate = () => {
    setError(null);

    if (!fileName.trim()) {
      setError(t('createFile.errors.required'));
      return;
    }

    // Validate file name (no special characters except underscore, hyphen, dot)
    const validNameRegex = /^[a-zA-Z0-9_\-\.]+$/;
    if (!validNameRegex.test(fileName)) {
      setError(t('createFile.errors.invalidChars'));
      return;
    }

    createFileMutation.mutate();
  };

  const getFullFileName = () => {
    if (!fileName) return "";
    return fileName.includes('.') ? fileName : `${fileName}.${fileExtension}`;
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>{t('createFile.title')}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {t('createFile.description')}
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text size="2" weight="bold" mb="1">{t('createFile.fileNameLabel')}</Text>
            <Flex gap="2">
              <TextField.Root
                style={{ flex: 1 }}
                placeholder={t('createFile.fileNamePlaceholder')}
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !createFileMutation.isPending) {
                    handleCreate();
                  }
                }}
              />
              {!fileName.includes('.') && (
                <Select.Root value={fileExtension} onValueChange={setFileExtension}>
                  <Select.Trigger style={{ width: '100px' }} />
                  <Select.Content>
                    <Select.Item value="tex">.tex</Select.Item>
                    <Select.Item value="bib">.bib</Select.Item>
                    <Select.Item value="sty">.sty</Select.Item>
                    <Select.Item value="cls">.cls</Select.Item>
                    <Select.Item value="txt">.txt</Select.Item>
                  </Select.Content>
                </Select.Root>
              )}
            </Flex>
            {fileName && (
              <Text size="1" color="gray" mt="1">
                {t('createFile.willCreate', { name: getFullFileName() })}
              </Text>
            )}
          </Box>

          <Box>
            <Text size="2" weight="bold" mb="1">{t('createFile.folderLabel')}</Text>
            <FolderSelect
              projectId={projectId}
              value={folder}
              onChange={setFolder}
              allowCreate
            />
          </Box>

          {error && (
            <Box p="3" style={{ backgroundColor: '#fee', borderRadius: '6px' }}>
              <Text size="2" color="red">{error}</Text>
            </Box>
          )}

          {createFileMutation.isSuccess && (
            <Box p="3" style={{ backgroundColor: '#efe', borderRadius: '6px' }}>
              <Text size="2" color="green">{t('createFile.success')}</Text>
            </Box>
          )}

          <Flex gap="3" mt="2" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button" disabled={createFileMutation.isPending}>
                {t('createFile.cancel')}
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleCreate}
              disabled={!fileName.trim() || createFileMutation.isPending}
              loading={createFileMutation.isPending}
            >
              {t('createFile.submit')}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
