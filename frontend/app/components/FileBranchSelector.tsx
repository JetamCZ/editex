import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu, Button, Dialog, TextField, Text, Flex, IconButton, Tooltip } from '@radix-ui/themes';
import { GitBranch, Plus, Trash2, GitMerge, Save, ChevronDown, Pencil, AlertTriangle, CheckCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useFileBranches, useCreateBranch, useDeleteBranch, useSetActiveBranch, useCreateCommit, useMergeBranch, useRenameBranch, useMergePreviewQuery } from '~/hooks/useFileBranches';
import type { ProjectFile } from '../../types/file';
import GitTree from '~/components/GitTree';

interface Props {
    selectedFile: ProjectFile;
    onBranchChanged?: () => void;
}

const FileBranchSelector = ({ selectedFile, onBranchChanged }: Props) => {
    const { t } = useTranslation();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [commitDialogOpen, setCommitDialogOpen] = useState(false);
    const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renameBranchId, setRenameBranchId] = useState<string | null>(null);
    const [renameBranchValue, setRenameBranchValue] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [commitMessage, setCommitMessage] = useState('');
    const [mergeTargetBranchId, setMergeTargetBranchId] = useState<string | null>(null);
    const [mergeStep, setMergeStep] = useState<'select' | 'preview'>('select');
    const [mergeEditorContent, setMergeEditorContent] = useState('');
    const [mergeConflictCount, setMergeConflictCount] = useState(0);
    const mergeEditorRef = useRef<any>(null);

    const activeBranchName = selectedFile.activeBranchName || 'main';
    const activeBranchId = selectedFile.activeBranchId;

    const { data: branches = [] } = useFileBranches(selectedFile.id);
    const createBranch = useCreateBranch();
    const deleteBranch = useDeleteBranch();
    const setActiveBranch = useSetActiveBranch();
    const createCommit = useCreateCommit();
    const mergeBranch = useMergeBranch();
    const renameBranch = useRenameBranch();
    const mergePreview = useMergePreviewQuery(activeBranchId ?? null, mergeTargetBranchId);

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
        if (!confirm(`Delete variant "${branchName}"?`)) return;
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

    const handleOpenRename = useCallback((branchId: string, currentName: string) => {
        setRenameBranchId(branchId);
        setRenameBranchValue(currentName);
        setRenameDialogOpen(true);
    }, []);

    const handleRename = useCallback(() => {
        if (!renameBranchId) return;
        const trimmed = renameBranchValue.trim();
        if (!trimmed) return;
        renameBranch.mutate(
            { fileId: selectedFile.id, branchId: renameBranchId, name: trimmed },
            {
                onSuccess: () => {
                    setRenameDialogOpen(false);
                    setRenameBranchId(null);
                    setRenameBranchValue('');
                    onBranchChanged?.();
                },
            }
        );
    }, [renameBranchId, renameBranchValue, renameBranch, selectedFile.id, onBranchChanged]);

    const resetMergeDialog = useCallback(() => {
        setMergeStep('select');
        setMergeTargetBranchId(null);
        setMergeEditorContent('');
        setMergeConflictCount(0);
    }, []);

    const handleMergeDialogChange = useCallback((open: boolean) => {
        setMergeDialogOpen(open);
        if (!open) resetMergeDialog();
    }, [resetMergeDialog]);

    const handleMergePreview = useCallback(async () => {
        const result = await mergePreview.refetch();
        if (result.data) {
            setMergeEditorContent(result.data.content);
            setMergeConflictCount(result.data.conflictCount);
            setMergeStep('preview');
        }
    }, [mergePreview]);

    const handleMergeBack = useCallback(() => {
        setMergeStep('select');
        setMergeEditorContent('');
        setMergeConflictCount(0);
    }, []);

    const handleMerge = useCallback(() => {
        if (!activeBranchId || !mergeTargetBranchId) return;
        mergeBranch.mutate(
            {
                sourceBranchId: activeBranchId,
                targetBranchId: mergeTargetBranchId,
                fileId: selectedFile.id,
                resolvedContent: mergeEditorContent,
            },
            {
                onSuccess: () => {
                    setMergeDialogOpen(false);
                    resetMergeDialog();
                    onBranchChanged?.();
                },
            }
        );
    }, [activeBranchId, mergeTargetBranchId, mergeBranch, selectedFile.id, mergeEditorContent, resetMergeDialog, onBranchChanged]);

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
                    <Tooltip content={t('fileBranchSelector.switchVariant')}>
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
                        <DropdownMenu.Label>{t('fileBranchSelector.variantsLabel')}</DropdownMenu.Label>
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
                                            <Text size="1" color="blue">{t('fileBranchSelector.current')}</Text>
                                        )}
                                        {branch.name !== 'main' && (
                                            <IconButton
                                                size="1"
                                                variant="ghost"
                                                color="gray"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenRename(branch.id, branch.name);
                                                }}
                                            >
                                                <Pencil size={12} strokeWidth={2} />
                                            </IconButton>
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
                            <Text size="2">{t('fileBranchSelector.newVariant')}</Text>
                        </DropdownMenu.Item>
                        {branches.length > 1 && (
                            <DropdownMenu.Item onSelect={() => setMergeDialogOpen(true)}>
                                <GitMerge size={14} strokeWidth={2} />
                                <Text size="2">{t('fileBranchSelector.combine')}</Text>
                            </DropdownMenu.Item>
                        )}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>

                <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--gray-6)', margin: '0 2px' }} />

                {/* Save version button */}
                <Tooltip content={t('fileBranchSelector.saveVersionTooltip')}>
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
                <Tooltip content={t('fileBranchSelector.versionHistoryTooltip')}>
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

            {/* Create Variant Dialog */}
            <Dialog.Root open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <Dialog.Content maxWidth="400px">
                    <Dialog.Title>{t('fileBranchSelector.newVariantDialog.title')}</Dialog.Title>
                    <Dialog.Description size="2" color="gray">
                        {t('fileBranchSelector.newVariantDialog.description', { branch: activeBranchName, file: selectedFile.originalFileName })}
                    </Dialog.Description>
                    <Flex direction="column" gap="3" mt="4">
                        <TextField.Root
                            placeholder={t('fileBranchSelector.newVariantDialog.namePlaceholder')}
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                            autoFocus
                        />
                        <Flex gap="3" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">{t('fileBranchSelector.newVariantDialog.cancel')}</Button>
                            </Dialog.Close>
                            <Button
                                onClick={handleCreateBranch}
                                disabled={!newBranchName.trim() || createBranch.isPending}
                                loading={createBranch.isPending}
                            >
                                {t('fileBranchSelector.newVariantDialog.submit')}
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Rename Variant Dialog */}
            <Dialog.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <Dialog.Content maxWidth="400px">
                    <Dialog.Title>{t('fileBranchSelector.renameVariantDialog.title')}</Dialog.Title>
                    <Dialog.Description size="2" color="gray">
                        {t('fileBranchSelector.renameVariantDialog.description')}
                    </Dialog.Description>
                    <Flex direction="column" gap="3" mt="4">
                        <TextField.Root
                            placeholder={t('fileBranchSelector.renameVariantDialog.namePlaceholder')}
                            value={renameBranchValue}
                            onChange={(e) => setRenameBranchValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            autoFocus
                        />
                        <Flex gap="3" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">{t('fileBranchSelector.renameVariantDialog.cancel')}</Button>
                            </Dialog.Close>
                            <Button
                                onClick={handleRename}
                                disabled={!renameBranchValue.trim() || renameBranch.isPending}
                                loading={renameBranch.isPending}
                            >
                                {t('fileBranchSelector.renameVariantDialog.submit')}
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Save Version Dialog */}
            <Dialog.Root open={commitDialogOpen} onOpenChange={setCommitDialogOpen}>
                <Dialog.Content maxWidth="400px">
                    <Dialog.Title>{t('fileBranchSelector.saveVersionDialog.title')}</Dialog.Title>
                    <Dialog.Description size="2" color="gray">
                        {t('fileBranchSelector.saveVersionDialog.description', { file: selectedFile.originalFileName, branch: activeBranchName })}
                    </Dialog.Description>
                    <Flex direction="column" gap="3" mt="4">
                        <TextField.Root
                            placeholder={t('fileBranchSelector.saveVersionDialog.descriptionPlaceholder')}
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                            autoFocus
                        />
                        <Flex gap="3" justify="end">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">{t('fileBranchSelector.saveVersionDialog.cancel')}</Button>
                            </Dialog.Close>
                            <Button
                                onClick={handleCommit}
                                disabled={createCommit.isPending}
                                loading={createCommit.isPending}
                            >
                                {t('fileBranchSelector.saveVersionDialog.submit')}
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Combine Dialog */}
            <Dialog.Root open={mergeDialogOpen} onOpenChange={handleMergeDialogChange}>
                <Dialog.Content maxWidth={mergeStep === 'preview' ? '860px' : '450px'} style={{ transition: 'max-width 0.2s' }}>
                    <Dialog.Title>{t('fileBranchSelector.combineDialog.title')}</Dialog.Title>

                    {/* ── Step 1: Select target branch ── */}
                    {mergeStep === 'select' && (
                        <>
                            <Dialog.Description size="2" color="gray">
                                {t('fileBranchSelector.combineDialog.description', { branch: activeBranchName })}
                            </Dialog.Description>
                            <Flex direction="column" gap="2" mt="4">
                                <Text size="2" weight="medium" color="gray">{t('fileBranchSelector.combineDialog.targetLabel')}</Text>
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
                                        <Button variant="soft" color="gray">{t('fileBranchSelector.combineDialog.cancel')}</Button>
                                    </Dialog.Close>
                                    <Button
                                        color="blue"
                                        onClick={handleMergePreview}
                                        disabled={!mergeTargetBranchId || mergePreview.isFetching}
                                        loading={mergePreview.isFetching}
                                    >
                                        <GitMerge size={14} strokeWidth={2} />
                                        {t('fileBranchSelector.combineDialog.previewButton')}
                                    </Button>
                                </Flex>
                            </Flex>
                        </>
                    )}

                    {/* ── Step 2: Preview & conflict resolution ── */}
                    {mergeStep === 'preview' && (
                        <Flex direction="column" gap="3" mt="3">
                            {/* Status banner */}
                            {mergeConflictCount > 0 ? (
                                <Flex
                                    align="center"
                                    gap="2"
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        backgroundColor: 'var(--red-2)',
                                        border: '1px solid var(--red-6)',
                                        color: 'var(--red-11)',
                                        fontSize: '13px',
                                    }}
                                >
                                    <AlertTriangle size={15} strokeWidth={2} />
                                    {t('fileBranchSelector.combineDialog.conflictsFound', { count: mergeConflictCount })}
                                </Flex>
                            ) : (
                                <Flex
                                    align="center"
                                    gap="2"
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        backgroundColor: 'var(--green-2)',
                                        border: '1px solid var(--green-6)',
                                        color: 'var(--green-11)',
                                        fontSize: '13px',
                                    }}
                                >
                                    <CheckCircle size={15} strokeWidth={2} />
                                    {t('fileBranchSelector.combineDialog.cleanMerge')}
                                </Flex>
                            )}

                            {/* Monaco editor */}
                            <div style={{ border: '1px solid var(--gray-5)', borderRadius: '6px', overflow: 'hidden' }}>
                                <Editor
                                    height="420px"
                                    language="plaintext"
                                    value={mergeEditorContent}
                                    onChange={(val) => setMergeEditorContent(val ?? '')}
                                    onMount={(editor) => { mergeEditorRef.current = editor; }}
                                    options={{
                                        minimap: { enabled: false },
                                        lineNumbers: 'on',
                                        wordWrap: 'on',
                                        scrollBeyondLastLine: false,
                                        fontSize: 13,
                                        renderLineHighlight: 'all',
                                    }}
                                />
                            </div>

                            <Flex gap="3" justify="between">
                                <Button variant="soft" color="gray" onClick={handleMergeBack}>
                                    {t('fileBranchSelector.combineDialog.backButton')}
                                </Button>
                                <Button
                                    color="blue"
                                    onClick={handleMerge}
                                    disabled={mergeBranch.isPending}
                                    loading={mergeBranch.isPending}
                                >
                                    <GitMerge size={14} strokeWidth={2} />
                                    {t('fileBranchSelector.combineDialog.mergeButton')}
                                </Button>
                            </Flex>
                        </Flex>
                    )}
                </Dialog.Content>
            </Dialog.Root>

            {/* Git Tree / History Dialog */}
            <Dialog.Root open={historyOpen} onOpenChange={setHistoryOpen}>
                <Dialog.Content maxWidth="600px" style={{ maxHeight: '80vh' }}>
                    <Dialog.Title>
                        <Flex align="center" gap="2">
                            <GitBranch size={18} strokeWidth={2} />
                            {t('fileBranchSelector.historyDialog.title', { file: selectedFile.originalFileName })}
                        </Flex>
                    </Dialog.Title>
                    <GitTree
                        fileId={selectedFile.id}
                        activeBranchId={activeBranchId}
                    />
                    <Flex justify="end" mt="4">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">{t('fileBranchSelector.historyDialog.close')}</Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </>
    );
};

export default FileBranchSelector;
