import { Dialog, Button, Flex, Text, Progress, Box, TextField } from "@radix-ui/themes";
import { useState, useRef } from "react";
import axios from "axios";
import useAuth from "~/hooks/useAuth";
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface FileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseProject: string;
  branch?: string;
  folder?: string;
}

interface FilePreview {
  file: File;
  name: string;
  size: string;
  type: string;
}

export default function FileUploadModal({
  open,
  onOpenChange,
  baseProject,
  branch = "main",
  folder = "/files",
}: FileUploadModalProps) {
  const {bearerToken} = useAuth()
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(folder);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (filesToUpload: FilePreview[]) => {
      const totalFiles = filesToUpload.length;

      for (let i = 0; i < totalFiles; i++) {
        const formData = new FormData();
        formData.append('file', filesToUpload[i].file);
        formData.append('baseProject', baseProject);
        formData.append('branch', branch);
        formData.append('folder', selectedFolder);

        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/files/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${bearerToken}`
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const fileProgress = (progressEvent.loaded / progressEvent.total) * 100;
                const totalProgress = ((i / totalFiles) * 100) + (fileProgress / totalFiles);
                setUploadProgress(Math.round(totalProgress));
              }
            }
          }
        );
      }
    },
    onSuccess: () => {
      // Invalidate and refetch project files
      queryClient.invalidateQueries({ queryKey: ['projectFiles', baseProject, branch] });
      setFiles([]);
      setUploadProgress(100);

      setTimeout(() => {
        onOpenChange(false);
        setUploadProgress(0);
      }, 1500);
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const filePreviews: FilePreview[] = Array.from(selectedFiles).map(file => ({
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || 'unknown'
    }));

    setFiles(prev => [...prev, ...filePreviews]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (files.length === 0) return;
    uploadMutation.mutate(files);
  };

  const handleClose = () => {
    if (!uploadMutation.isPending) {
      setFiles([]);
      uploadMutation.reset();
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Content maxWidth="550px">
        <Dialog.Title>Upload Files</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Upload files to your project. Drag and drop or click to select files.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text size="2" weight="bold" mb="1">Upload to Folder</Text>
            <TextField.Root
              placeholder="e.g., /images or /chapters"
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
            >
              <TextField.Slot>📁</TextField.Slot>
            </TextField.Root>
            <Text size="1" color="gray" mt="1">
              Enter a folder path (must start with /). Example: /images, /chapters, /styles
            </Text>
          </Box>

          <Box
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: dragActive ? '2px dashed #6E56CF' : '2px dashed #ccc',
              borderRadius: '8px',
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: dragActive ? '#f8f9fa' : 'transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <Text size="2" color="gray">
              {dragActive ? 'Drop files here' : 'Drag and drop files here, or click to select'}
            </Text>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />
          </Box>

          {files.length > 0 && (
            <Box>
              <Text size="2" weight="bold" mb="2">Selected Files:</Text>
              <Flex direction="column" gap="2">
                {files.map((file, index) => (
                  <Flex
                    key={index}
                    justify="between"
                    align="center"
                    p="2"
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      backgroundColor: '#f9f9f9'
                    }}
                  >
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="medium">{file.name}</Text>
                      <Text size="1" color="gray">{file.size} • {file.type}</Text>
                    </Flex>
                    {!uploadMutation.isPending && (
                      <Button
                        variant="ghost"
                        color="red"
                        size="1"
                        onClick={() => removeFile(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </Flex>
                ))}
              </Flex>
            </Box>
          )}

          {uploadMutation.isPending && (
            <Box>
              <Text size="2" mb="2">Uploading... {uploadProgress}%</Text>
              <Progress value={uploadProgress} />
            </Box>
          )}

          {uploadMutation.isError && (
            <Box p="3" style={{ backgroundColor: '#fee', borderRadius: '6px' }}>
              <Text size="2" color="red">
                {uploadMutation.error instanceof Error ? uploadMutation.error.message : 'Failed to upload files'}
              </Text>
            </Box>
          )}

          {uploadMutation.isSuccess && (
            <Box p="3" style={{ backgroundColor: '#efe', borderRadius: '6px' }}>
              <Text size="2" color="green">Files uploaded successfully!</Text>
            </Box>
          )}

          <Flex gap="3" mt="2" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button" disabled={uploadMutation.isPending}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
