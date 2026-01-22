import { Dialog, Button, Flex, Text, Badge, Card, Select, ScrollArea, Spinner } from "@radix-ui/themes";
import { useState, useEffect, useMemo } from "react";
import { useMergePreview, useExecuteMerge } from "~/hooks/useMerge";
import { GitMerge, Plus, Pencil, Trash2, AlertTriangle, Check, FileText, Image } from "lucide-react";
import type { Branch } from "../../types/branch";
import type { FileMergeStatus, PostMergeAction, ResolvedFile, Resolution } from "../../types/merge";
import MergeConflictResolver from "./MergeConflictResolver";

interface MergeBranchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    baseProject: string;
    sourceBranch: Branch;
    branches: Branch[];
    onMergeComplete?: (targetBranch: string) => void;
}

export default function MergeBranchDialog({
    open,
    onOpenChange,
    baseProject,
    sourceBranch,
    branches,
    onMergeComplete,
}: MergeBranchDialogProps) {
    // Target branch is determined by source branch's sourceBranch field
    const targetBranch = sourceBranch.sourceBranch || "";

    const [postMergeAction, setPostMergeAction] = useState<PostMergeAction>("DELETE_BRANCH");
    const [resolvedFiles, setResolvedFiles] = useState<Map<string, ResolvedFile>>(new Map());
    const [conflictResolverOpen, setConflictResolverOpen] = useState(false);
    const [selectedConflictFile, setSelectedConflictFile] = useState<FileMergeStatus | null>(null);

    // Fetch merge preview
    const { data: preview, isLoading: previewLoading, error: previewError } = useMergePreview({
        baseProject,
        sourceBranch: sourceBranch.branch,
        targetBranch,
        enabled: open && !!targetBranch,
    });

    const executeMergeMutation = useExecuteMerge();

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setResolvedFiles(new Map());
            setPostMergeAction("DELETE_BRANCH");
            executeMergeMutation.reset();
        }
    }, [open]);

    const conflictedFiles = useMemo(() => {
        return preview?.files?.filter(f => f.status === 'CONFLICT') || [];
    }, [preview]);

    const unresolvedConflicts = useMemo(() => {
        return conflictedFiles.filter(f => !resolvedFiles.has(f.filePath));
    }, [conflictedFiles, resolvedFiles]);

    const canMerge = useMemo(() => {
        return preview?.canMerge &&
               unresolvedConflicts.length === 0 &&
               !executeMergeMutation.isPending;
    }, [preview, unresolvedConflicts, executeMergeMutation.isPending]);

    const handleResolveConflict = (file: FileMergeStatus) => {
        setSelectedConflictFile(file);
        setConflictResolverOpen(true);
    };

    const handleConflictResolved = (filePath: string, resolution: Resolution, content?: string) => {
        const file = conflictedFiles.find(f => f.filePath === filePath);
        if (file) {
            const resolved: ResolvedFile = {
                fileId: file.fileId,
                filePath: file.filePath,
                resolution,
                resolvedContent: content,
            };
            setResolvedFiles(prev => new Map(prev).set(filePath, resolved));
        }
        setConflictResolverOpen(false);
        setSelectedConflictFile(null);
    };

    const handleExecuteMerge = () => {
        if (!preview || !canMerge) return;

        const request = {
            sourceBranch: sourceBranch.branch,
            targetBranch,
            resolvedFiles: Array.from(resolvedFiles.values()),
            postMergeAction,
        };

        executeMergeMutation.mutate(
            { baseProject, request },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        onOpenChange(false);
                        onMergeComplete?.(targetBranch);
                    }
                },
            }
        );
    };

    const handleClose = () => {
        if (!executeMergeMutation.isPending) {
            onOpenChange(false);
        }
    };

    const getStatusIcon = (status: FileMergeStatus['status']) => {
        switch (status) {
            case 'ADDED': return <Plus className="h-4 w-4" />;
            case 'MODIFIED': return <Pencil className="h-4 w-4" />;
            case 'DELETED': return <Trash2 className="h-4 w-4" />;
            case 'CONFLICT': return <AlertTriangle className="h-4 w-4" />;
            case 'UNCHANGED': return <Check className="h-4 w-4" />;
        }
    };

    const getStatusColor = (status: FileMergeStatus['status']): "green" | "blue" | "red" | "orange" | "gray" => {
        switch (status) {
            case 'ADDED': return "green";
            case 'MODIFIED': return "blue";
            case 'DELETED': return "red";
            case 'CONFLICT': return "orange";
            case 'UNCHANGED': return "gray";
        }
    };

    const getFileIcon = (file: FileMergeStatus) => {
        if (file.isTextFile) {
            return <FileText className="h-4 w-4 text-gray-500" />;
        }
        return <Image className="h-4 w-4 text-gray-500" />;
    };

    return (
        <>
            <Dialog.Root open={open && !conflictResolverOpen} onOpenChange={handleClose}>
                <Dialog.Content maxWidth="600px" style={{ maxHeight: '80vh' }}>
                    <Dialog.Title>
                        <Flex align="center" gap="2">
                            <GitMerge className="h-5 w-5" />
                            Merge Branch
                        </Flex>
                    </Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Merge changes from "{sourceBranch.branch}" into "{targetBranch}"
                    </Dialog.Description>

                    {/* Validation Error */}
                    {preview && !preview.canMerge && preview.validationError && (
                        <Card mb="4" style={{ backgroundColor: 'var(--red-3)' }}>
                            <Flex align="center" gap="2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <Text size="2" color="red">{preview.validationError}</Text>
                            </Flex>
                        </Card>
                    )}

                    {/* Loading State */}
                    {previewLoading && (
                        <Flex justify="center" align="center" py="6">
                            <Spinner size="3" />
                            <Text ml="2">Analyzing branches...</Text>
                        </Flex>
                    )}

                    {/* Preview Error */}
                    {previewError && (
                        <Card mb="4" style={{ backgroundColor: 'var(--red-3)' }}>
                            <Text size="2" color="red">Failed to load merge preview</Text>
                        </Card>
                    )}

                    {/* Preview Content */}
                    {preview && preview.canMerge && (
                        <Flex direction="column" gap="4">
                            {/* Summary */}
                            <Flex gap="2" wrap="wrap">
                                {preview.addedCount > 0 && (
                                    <Badge color="green">{preview.addedCount} added</Badge>
                                )}
                                {preview.modifiedCount > 0 && (
                                    <Badge color="blue">{preview.modifiedCount} modified</Badge>
                                )}
                                {preview.deletedCount > 0 && (
                                    <Badge color="red">{preview.deletedCount} deleted</Badge>
                                )}
                                {preview.conflictCount > 0 && (
                                    <Badge color="orange">{preview.conflictCount} conflicts</Badge>
                                )}
                                {preview.unchangedCount > 0 && (
                                    <Badge color="gray">{preview.unchangedCount} unchanged</Badge>
                                )}
                            </Flex>

                            {/* File List */}
                            <Text size="2" weight="bold">Files</Text>
                            <ScrollArea style={{ maxHeight: '300px' }}>
                                <Flex direction="column" gap="2">
                                    {(preview.files || []).filter(f => f.status !== 'UNCHANGED').map((file) => (
                                        <Card key={file.filePath} size="1">
                                            <Flex justify="between" align="center">
                                                <Flex align="center" gap="2">
                                                    {getFileIcon(file)}
                                                    <Text size="2" style={{ fontFamily: 'monospace' }}>
                                                        {file.filePath}
                                                    </Text>
                                                    <Badge color={getStatusColor(file.status)} size="1">
                                                        <Flex align="center" gap="1">
                                                            {getStatusIcon(file.status)}
                                                            {file.status.toLowerCase()}
                                                        </Flex>
                                                    </Badge>
                                                </Flex>
                                                {file.status === 'CONFLICT' && (
                                                    <Button
                                                        size="1"
                                                        variant={resolvedFiles.has(file.filePath) ? "soft" : "solid"}
                                                        color={resolvedFiles.has(file.filePath) ? "green" : "orange"}
                                                        onClick={() => handleResolveConflict(file)}
                                                    >
                                                        {resolvedFiles.has(file.filePath) ? (
                                                            <>
                                                                <Check className="h-3 w-3" />
                                                                Resolved
                                                            </>
                                                        ) : (
                                                            "Resolve"
                                                        )}
                                                    </Button>
                                                )}
                                            </Flex>
                                        </Card>
                                    ))}
                                    {(preview.files || []).filter(f => f.status !== 'UNCHANGED').length === 0 && (
                                        <Text size="2" color="gray">No changes to merge</Text>
                                    )}
                                </Flex>
                            </ScrollArea>

                            {/* Unresolved Conflicts Warning */}
                            {unresolvedConflicts.length > 0 && (
                                <Card style={{ backgroundColor: 'var(--orange-3)' }}>
                                    <Flex align="center" gap="2">
                                        <AlertTriangle className="h-4 w-4" />
                                        <Text size="2">
                                            {unresolvedConflicts.length} conflict(s) must be resolved before merging
                                        </Text>
                                    </Flex>
                                </Card>
                            )}

                            {/* Post-Merge Action */}
                            <Flex direction="column" gap="2">
                                <Text size="2" weight="bold">After merge</Text>
                                <Select.Root
                                    value={postMergeAction}
                                    onValueChange={(value: PostMergeAction) => setPostMergeAction(value)}
                                >
                                    <Select.Trigger />
                                    <Select.Content>
                                        <Select.Item value="DELETE_BRANCH">
                                            Delete source branch "{sourceBranch.branch}"
                                        </Select.Item>
                                        <Select.Item value="RESET_BRANCH">
                                            Reset source branch (recreate from target)
                                        </Select.Item>
                                    </Select.Content>
                                </Select.Root>
                                <Text size="1" color="gray">
                                    {postMergeAction === 'DELETE_BRANCH'
                                        ? 'The source branch will be deleted after merging.'
                                        : 'The source branch will be deleted and recreated from the merged target.'}
                                </Text>
                            </Flex>

                            {/* Execution Error */}
                            {executeMergeMutation.isError && (
                                <Card style={{ backgroundColor: 'var(--red-3)' }}>
                                    <Text size="2" color="red">
                                        {(executeMergeMutation.error as any)?.response?.data?.message ||
                                            "Failed to execute merge"}
                                    </Text>
                                </Card>
                            )}
                        </Flex>
                    )}

                    {/* Actions */}
                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button
                                variant="soft"
                                color="gray"
                                disabled={executeMergeMutation.isPending}
                            >
                                Cancel
                            </Button>
                        </Dialog.Close>
                        <Button
                            onClick={handleExecuteMerge}
                            disabled={!canMerge}
                        >
                            {executeMergeMutation.isPending ? "Merging..." : "Merge Branch"}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Conflict Resolver Dialog */}
            {selectedConflictFile && (
                <MergeConflictResolver
                    open={conflictResolverOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            setConflictResolverOpen(false);
                            setSelectedConflictFile(null);
                        }
                    }}
                    baseProject={baseProject}
                    sourceBranch={sourceBranch.branch}
                    targetBranch={targetBranch}
                    file={selectedConflictFile}
                    onResolved={handleConflictResolved}
                    currentResolution={resolvedFiles.get(selectedConflictFile.filePath)}
                />
            )}
        </>
    );
}
