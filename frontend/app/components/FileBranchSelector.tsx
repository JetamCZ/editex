import { useState, useCallback } from 'react';
import { DropdownMenu, Button, Dialog, TextField, Text, Flex, IconButton, Tooltip } from '@radix-ui/themes';
import { GitBranch, Plus, Trash2, GitMerge, Save, ChevronDown } from 'lucide-react';
import { useFileBranches, useCreateBranch, useDeleteBranch, useSetActiveBranch, useCreateCommit, useMergeBranch } from '~/hooks/useFileBranches';
import type { ProjectFile } from '../../types/file';
import GitTree from '~/components/GitTree';

interface Props {
    selectedFile: ProjectFile;
    onBranchChanged?: () => void;
}

const FileBranchSelector = ({ selectedFile, onBranchChanged }: Props) => {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [commitDialogOpen, setCommitDialogOpen] = useState(false);
    const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');
    const [commitMessage, setCommitMessage] = useState('');
    const [mergeTargetBranchId, setMergeTargetBranchId] = useState<string | null>(null);

    const { data: branches = [] } = useFileBranches(selectedFile.id);
    const createBranch = useCreateBranch();
    const deleteBranch = useDeleteBranch();
    const setActiveBranch = useSetActiveBranch();
    const createCommit = useCreateCommit();
    const mergeBranch = useMergeBranch();

    const activeBranchName = selectedFile.activeBranchName || 'main';
    const activeBranchId = selectedFile.activeBranchId;

    const handleSwitchBranch = useCallback((branchId: string) => {
        if (branchId === activeBranchId) return;
        setActiveBranch.mutate(
            { fileId: selectedFile.id, branchId },
            { onSuccess: () => onBranchChanged?.() }
        );
    }, [activeBranchId, selectedFile.id, setActiveBranch, onBranchChanged]);

    const handleCreateBranch = useCallback(() => {
        if (!newBranchName.trim()) return;
        createBranch.mutate(
            { fileId: selectedFile.id, name: newBranchName.trim(), sourceBranch: activeBranchName },
            {
                onSuccess: (branch) => {
                    setNewBranchName('');
                    setCreateDialogOpen(false);
                    setActiveBranch.mutate(
                        { fileId: selectedFile.id, branchId: branch.id },
                        { onSuccess: () => onBranchChanged?.() }
                    );
                },
            }
        );
    }, [newBranchName, selectedFile.id, activeBranchName, createBranch, setActiveBranch, onBranchChanged]);

    const handleDeleteBranch = useCallback((branchId: string, branchName: string) => {
        if (!confirm(`Delete branch "${branchName}"?`)) return;
        deleteBranch.mutate({ fileId: selectedFile.id, branchId });
    }, [deleteBranch, selectedFile.id]);

    const handleCommit = useCallback(() => {
        if (!activeBranchId) return;
        createCommit.mutate(
            { branchId: activeBranchId, message: commitMessage.trim() || undefined },
            {
                onSuccess: () => {
                    setCommitMessage('');
                    setCommitDialogOpen(false);
                },
            }
        );
    }, [activeBranchId, commitMessage, createCommit]);

    const handleMerge = useCallback(() => {
        if (!activeBranchId || !mergeTargetBranchId) return;
        mergeBranch.mutate(
            { sourceBranchId: activeBranchId, targetBranchId: mergeTargetBranchId },
            {
                onSuccess: () => {
                    setMergeDialogOpen(false);
                    setMergeTargetBranchId(null);
                },
            }
        );
    }, [activeBranchId, mergeTargetBranchId, mergeBranch]);

    return (
        <>
            {/* Toolbar group matching EditorToolbar style */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'var(--gray-3)',
                borderRadius: '8px',
                padding: '0 4px',
                height: '36px',
                overflow: 'hidden',
            }}>
                {/* Branch selector dropdown */}
                <DropdownMenu.Root>
                    <Tooltip content="Switch branch">
                        <DropdownMenu.Trigger>
                            <button style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0 8px',
                                height: '32px',
                                border: 'none',
                                background: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                color: 'var(--gray-12)',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'background-color 0.1s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--gray-4)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <GitBranch size={16} strokeWidth={2} style={{ color: 'var(--gray-11)' }} />
                                <span>{activeBranchName}</span>
                                {branches.length > 1 && (
                                    <span style={{
                                        fontSize: '10px',
                                        backgroundColor: 'var(--accent-4)',
                                        color: 'var(--accent-11)',
                                        borderRadius: '8px',
                                        padding: '1px 5px',
                                        fontWeight: 600,
                                    }}>
                                        {branches.length}
                                    </span>
                                )}
                                <ChevronDown size={12} strokeWidth={2} style={{ color: 'var(--gray-9)' }} />
                            </button>
                        </DropdownMenu.Trigger>
                    </Tooltip>
                    <DropdownMenu.Content size="2" align="start">
                        <DropdownMenu.Label>Branches</DropdownMenu.Label>
                        {branches.map(branch => (
                            <DropdownMenu.Item
                                key={branch.id}
                                onSelect={() => handleSwitchBranch(branch.id)}
                            >
                                <Flex justify="between" align="center" width="100%" gap="3">
                                    <Flex align="center" gap="2">
                                        <GitBranch size={14} strokeWidth={2} />
                                        <Text size="2" weight={branch.id === activeBranchId ? 'bold' : 'regular'}>
                                            {branch.name}
                                        </Text>
                                    </Flex>
                                    <Flex align="center" gap="1">
                                        {branch.id === activeBranchId && (
                                            <Text size="1" color="blue">active</Text>
                                        )}
                                        {branch.name !== 'main' && branch.id !== activeBranchId && (
                                            <IconButton
                                                size="1"
                                                variant="ghost"
                                                color="red"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteBranch(branch.id, branch.name);
                                                }}
                                            >
                                                <Trash2 size={12} strokeWidth={2} />
                                            </IconButton>
                                        )}
                                    </Flex>
                                </Flex>
                            </DropdownMenu.Item>
                        ))}
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item onSelect={() => setCreateDialogOpen(true)}>
                            <Plus size={14} strokeWidth={2} />
                            <Text size="2">New branch...</Text>
                        </DropdownMenu.Item>
                        {branches.length > 1 && (
                            <DropdownMenu.Item onSelect={() => setMergeDialogOpen(true)}>
                                <GitMerge size={14} strokeWidth={2} />
                                <Text size="2">Merge...</Text>
                            </DropdownMenu.Item>
                        )}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>

                <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--gray-6)', margin: '0 2px' }} />

                {/* Commit button */}
                <Tooltip content="Commit snapshot">
                    <IconButton
                        size="2"
                        variant="ghost"
                        color="gray"
                        onClick={() => setCommitDialogOpen(true)}
                        disabled={!activeBranchId}
                        style={{ borderRadius: '6px', width: '32px', height: '32px' }}
                    >
                        <Save size={16} strokeWidth={2} />
                    </IconButton>
                </Tooltip>

                {/* History / Git tree button */}
                <Tooltip content="Branch & commit history">
                    <IconButton
                        size="2"
                        variant="ghost"
                        color="gray"
                        onClick={() => setHistoryOpen(true)}
                        disabled={!activeBranchId}
                        style={{ borderRadius: '6px', width: '32px', height: '32px' }}
                    >
                        <GitBranch size={16} strokeWidth={2} />
                    </IconButton>
                </Tooltip>
            </div>

            {/* Create Branch Dialog */}
            <Dialog.Root open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <Dialog.Content maxWidth="400px">
                    <Dialog.Title>Create New Branch</Dialog.Title>
                    <Dialog.Description size="2" color="gray">
                        Create a new branch from "{activeBranchName}" for {selectedFile.originalFileName}
                    </Dialog.Description>
                    <Flex direction="column" gap="3" mt="4">
                        <TextField.Root
                            placeholder="Branch name"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                            autoFocus
                        />
                        <Flex gap="3" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">Cancel</Button>
                            </Dialog.Close>
                            <Button
                                onClick={handleCreateBranch}
                                disabled={!newBranchName.trim() || createBranch.isPending}
                                loading={createBranch.isPending}
                            >
                                Create Branch
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Commit Dialog */}
            <Dialog.Root open={commitDialogOpen} onOpenChange={setCommitDialogOpen}>
                <Dialog.Content maxWidth="400px">
                    <Dialog.Title>Commit Snapshot</Dialog.Title>
                    <Dialog.Description size="2" color="gray">
                        Save the current state of "{selectedFile.originalFileName}" on branch "{activeBranchName}"
                    </Dialog.Description>
                    <Flex direction="column" gap="3" mt="4">
                        <TextField.Root
                            placeholder="Commit message (optional)"
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                            autoFocus
                        />
                        <Flex gap="3" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">Cancel</Button>
                            </Dialog.Close>
                            <Button
                                onClick={handleCommit}
                                disabled={createCommit.isPending}
                                loading={createCommit.isPending}
                            >
                                Commit
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Merge Dialog */}
            <Dialog.Root open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
                <Dialog.Content maxWidth="450px">
                    <Dialog.Title>Merge Branches</Dialog.Title>
                    <Dialog.Description size="2" color="gray">
                        Merge content from "{activeBranchName}" into another branch
                    </Dialog.Description>
                    <Flex direction="column" gap="2" mt="4">
                        <Text size="2" weight="medium" color="gray">Target branch:</Text>
                        {branches
                            .filter(b => b.id !== activeBranchId)
                            .map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => setMergeTargetBranchId(branch.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        border: mergeTargetBranchId === branch.id
                                            ? '2px solid var(--accent-9)'
                                            : '1px solid var(--gray-5)',
                                        backgroundColor: mergeTargetBranchId === branch.id
                                            ? 'var(--accent-2)'
                                            : 'var(--gray-1)',
                                        cursor: 'pointer',
                                        transition: 'all 0.1s',
                                        fontSize: '14px',
                                        color: 'var(--gray-12)',
                                    }}
                                >
                                    <GitBranch size={14} strokeWidth={2} />
                                    {branch.name}
                                </button>
                            ))}
                        <Flex gap="3" justify="end" mt="3">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">Cancel</Button>
                            </Dialog.Close>
                            <Button
                                color="blue"
                                onClick={handleMerge}
                                disabled={!mergeTargetBranchId || mergeBranch.isPending}
                                loading={mergeBranch.isPending}
                            >
                                <GitMerge size={14} strokeWidth={2} />
                                Merge
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Git Tree / History Dialog */}
            <Dialog.Root open={historyOpen} onOpenChange={setHistoryOpen}>
                <Dialog.Content maxWidth="600px" style={{ maxHeight: '80vh' }}>
                    <Dialog.Title>
                        <Flex align="center" gap="2">
                            <GitBranch size={18} strokeWidth={2} />
                            History — {selectedFile.originalFileName}
                        </Flex>
                    </Dialog.Title>
                    <GitTree
                        fileId={selectedFile.id}
                        activeBranchId={activeBranchId}
                    />
                    <Flex justify="end" mt="4">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">Close</Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </>
    );
};

export default FileBranchSelector;
