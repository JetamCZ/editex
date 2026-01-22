import { Dialog, Button, Flex, Text, Box, TextField, Select } from "@radix-ui/themes";
import { useState } from "react";
import axios from "axios";
import useAuth from "~/hooks/useAuth";
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseProject: string;
  branch: string;
}

const FILE_TEMPLATES: Record<string, string> = {
  tex: `\\documentclass{article}
\\begin{document}

% Your content here

\\end{document}
`,
  bib: `@article{example,
  author = {Author Name},
  title = {Article Title},
  journal = {Journal Name},
  year = {2024},
}
`,
  sty: `% Custom style file
\\NeedsTeXFormat{LaTeX2e}
\\ProvidesPackage{custom}[2024/01/01 Custom Package]

% Package options and commands here
`,
  cls: `% Custom document class
\\NeedsTeXFormat{LaTeX2e}
\\ProvidesClass{custom}[2024/01/01 Custom Class]
\\LoadClass{article}

% Class options and commands here
`,
  txt: "",
};

export default function CreateFileModal({
  open,
  onOpenChange,
  baseProject,
  branch,
}: CreateFileModalProps) {
  const { bearerToken } = useAuth();
  const queryClient = useQueryClient();

  const [fileName, setFileName] = useState("");
  const [fileExtension, setFileExtension] = useState("tex");
  const [folder, setFolder] = useState("/");
  const [error, setError] = useState<string | null>(null);

  const createFileMutation = useMutation({
    mutationFn: async () => {
      const fullFileName = fileName.includes('.') ? fileName : `${fileName}.${fileExtension}`;
      const template = FILE_TEMPLATES[fileExtension] || "";

      // Create a blob from the template content
      const blob = new Blob([template], { type: 'text/plain' });
      const file = new File([blob], fullFileName, { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('baseProject', baseProject);
      formData.append('branch', branch);
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
      queryClient.invalidateQueries({ queryKey: ['projectFiles', baseProject, branch] });
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
      setError("File name is required");
      return;
    }

    // Validate file name (no special characters except underscore, hyphen, dot)
    const validNameRegex = /^[a-zA-Z0-9_\-\.]+$/;
    if (!validNameRegex.test(fileName)) {
      setError("File name can only contain letters, numbers, underscores, hyphens, and dots");
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
        <Dialog.Title>Create New File</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create a new file in your project.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text size="2" weight="bold" mb="1">File Name</Text>
            <Flex gap="2">
              <TextField.Root
                style={{ flex: 1 }}
                placeholder="e.g., chapter1 or document.tex"
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
                Will create: {getFullFileName()}
              </Text>
            )}
          </Box>

          <Box>
            <Text size="2" weight="bold" mb="1">Folder</Text>
            <TextField.Root
              placeholder="e.g., / or /chapters"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            >
              <TextField.Slot side="left">
                <Text size="1" color="gray">Path:</Text>
              </TextField.Slot>
            </TextField.Root>
            <Text size="1" color="gray" mt="1">
              Enter a folder path. Use / for root directory.
            </Text>
          </Box>

          {error && (
            <Box p="3" style={{ backgroundColor: '#fee', borderRadius: '6px' }}>
              <Text size="2" color="red">{error}</Text>
            </Box>
          )}

          {createFileMutation.isSuccess && (
            <Box p="3" style={{ backgroundColor: '#efe', borderRadius: '6px' }}>
              <Text size="2" color="green">File created successfully!</Text>
            </Box>
          )}

          <Flex gap="3" mt="2" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button" disabled={createFileMutation.isPending}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleCreate}
              disabled={!fileName.trim() || createFileMutation.isPending}
              loading={createFileMutation.isPending}
            >
              Create File
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
