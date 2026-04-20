import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Flex, Text, Select, Spinner, SegmentedControl } from '@radix-ui/themes';
import { DiffEditor } from '@monaco-editor/react';
import { GitBranch, GitCommitHorizontal } from 'lucide-react';
import { useBranchDiff, useBranchCommits, useCommitDiff } from '~/hooks/useFileBranches';
import type { FileBranch } from '../../types/file';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    branches: FileBranch[];
    activeBranchId: number | undefined;
    fileName: string;
}

type DiffMode = 'branches' | 'commits';

// Branch-based diff picker
function BranchDiffPicker({ branches, activeBranchId, t }: {
    branches: FileBranch[];
    activeBranchId: number | undefined;
    t: (key: string) => string;
}) {
    const defaultOtherId = branches.find(b => b.id !== activeBranchId)?.id ?? null;
    const [sourceId, setSourceId] = useState<number | null>(activeBranchId ?? null);
    const [targetId, setTargetId] = useState<number | null>(defaultOtherId);

    const sameSelected = sourceId !== null && sourceId === targetId;
    const { data: diff, isFetching, isError } = useBranchDiff(
        sourceId,
        sameSelected ? null : targetId
    );

    return (
        <>
            <Flex gap="3" align="center" mt="3" mb="3">
                <Flex align="center" gap="2" style={{ flex: 1 }}>
                    <Text size="2" color="gray" style={{ whiteSpace: 'nowrap' }}>{t('diffViewDialog.original')}</Text>
                    <Select.Root value={sourceId?.toString() ?? ''} onValueChange={v => setSourceId(Number(v))}>
                        <Select.Trigger style={{ flex: 1 }} />
                        <Select.Content>
                            {branches.map(b => <Select.Item key={b.id} value={b.id.toString()}>{b.name}</Select.Item>)}
                        </Select.Content>
                    </Select.Root>
                </Flex>
                <Text size="2" color="gray">→</Text>
                <Flex align="center" gap="2" style={{ flex: 1 }}>
                    <Text size="2" color="gray" style={{ whiteSpace: 'nowrap' }}>{t('diffViewDialog.modified')}</Text>
                    <Select.Root value={targetId?.toString() ?? ''} onValueChange={v => setTargetId(Number(v))}>
                        <Select.Trigger style={{ flex: 1 }} />
                        <Select.Content>
                            {branches.map(b => <Select.Item key={b.id} value={b.id.toString()}>{b.name}</Select.Item>)}
                        </Select.Content>
                    </Select.Root>
                </Flex>
            </Flex>
            <DiffContent diff={diff} isFetching={isFetching} isError={isError} empty={!sourceId || !targetId || sameSelected} t={t} />
        </>
    );
}

// Commit picker for one side
function CommitSidePicker({ branchId, selectedHash, onSelect, branches, label, t }: {
    branchId: number | null;
    selectedHash: string | null;
    onSelect: (branchId: number, hash: string) => void;
    branches: FileBranch[];
    label: string;
    t: (key: string) => string;
}) {
    const [localBranchId, setLocalBranchId] = useState<number | null>(branchId);
    const { data: commits = [], isFetching } = useBranchCommits(localBranchId);

    const handleBranchChange = (v: string) => {
        setLocalBranchId(Number(v));
    };

    const handleCommitChange = (hash: string) => {
        if (localBranchId) onSelect(localBranchId, hash);
    };

    return (
        <Flex direction="column" gap="2" style={{ flex: 1 }}>
            <Text size="2" color="gray">{label}</Text>
            <Select.Root value={localBranchId?.toString() ?? ''} onValueChange={handleBranchChange}>
                <Select.Trigger placeholder={t('diffViewDialog.selectVariant')} style={{ width: '100%' }} />
                <Select.Content>
                    {branches.map(b => <Select.Item key={b.id} value={b.id.toString()}>{b.name}</Select.Item>)}
                </Select.Content>
            </Select.Root>
            <Select.Root
                value={selectedHash ?? ''}
                onValueChange={handleCommitChange}
                disabled={!localBranchId || isFetching || commits.length === 0}
            >
                <Select.Trigger placeholder={isFetching ? t('diffViewDialog.loading') : t('diffViewDialog.selectCommit')} style={{ width: '100%' }} />
                <Select.Content>
                    {commits.map(c => (
                        <Select.Item key={c.hash} value={c.hash}>
                            <Flex align="center" gap="2">
                                <span style={{ fontFamily: 'monospace', color: 'var(--gray-10)', fontSize: '12px' }}>{c.hash}</span>
                                {c.message && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{c.message}</span>}
                            </Flex>
                        </Select.Item>
                    ))}
                    {!isFetching && commits.length === 0 && (
                        <Select.Item value="_none" disabled>{t('diffViewDialog.noCommits')}</Select.Item>
                    )}
                </Select.Content>
            </Select.Root>
        </Flex>
    );
}

// Commit-based diff picker
function CommitDiffPicker({ branches, activeBranchId, t }: {
    branches: FileBranch[];
    activeBranchId: number | undefined;
    t: (key: string) => string;
}) {
    const [sourceHash, setSourceHash] = useState<string | null>(null);
    const [targetHash, setTargetHash] = useState<string | null>(null);

    const sameHash = sourceHash !== null && sourceHash === targetHash;
    const { data: diff, isFetching, isError } = useCommitDiff(sourceHash, sameHash ? null : targetHash);

    return (
        <>
            <Flex gap="3" align="start" mt="3" mb="3">
                <CommitSidePicker
                    branchId={activeBranchId ?? null}
                    selectedHash={sourceHash}
                    onSelect={(_, hash) => setSourceHash(hash)}
                    branches={branches}
                    label={t('diffViewDialog.original')}
                    t={t}
                />
                <Text size="2" color="gray" style={{ alignSelf: 'center', paddingTop: '24px' }}>→</Text>
                <CommitSidePicker
                    branchId={activeBranchId ?? null}
                    selectedHash={targetHash}
                    onSelect={(_, hash) => setTargetHash(hash)}
                    branches={branches}
                    label={t('diffViewDialog.modified')}
                    t={t}
                />
            </Flex>
            <DiffContent diff={diff} isFetching={isFetching} isError={isError} empty={!sourceHash || !targetHash || sameHash} t={t} />
        </>
    );
}

// Shared diff display
function DiffContent({ diff, isFetching, isError, empty, t }: {
    diff: { sourceContent: string; targetContent: string } | undefined;
    isFetching: boolean;
    isError: boolean;
    empty: boolean;
    t: (key: string) => string;
}) {
    return (
        <div style={{ border: '1px solid var(--gray-5)', borderRadius: '6px', overflow: 'hidden', position: 'relative', minHeight: '400px' }}>
            {isFetching && (
                <Flex align="center" justify="center" style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'var(--color-background)' }}>
                    <Spinner size="3" />
                </Flex>
            )}
            {!isFetching && isError && (
                <Flex align="center" justify="center" style={{ height: '400px' }}>
                    <Text size="2" color="red">{t('diffViewDialog.error')}</Text>
                </Flex>
            )}
            {!isFetching && !isError && empty && (
                <Flex align="center" justify="center" style={{ height: '400px' }}>
                    <Text size="2" color="gray">{t('diffViewDialog.selectBranches')}</Text>
                </Flex>
            )}
            {!isFetching && !isError && !empty && diff && (
                <DiffEditor
                    height="500px"
                    language="latex"
                    original={diff.sourceContent}
                    modified={diff.targetContent}
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        renderSideBySide: true,
                        scrollBeyondLastLine: false,
                        fontSize: 13,
                        wordWrap: 'on',
                    }}
                />
            )}
        </div>
    );
}

const DiffViewDialog = ({ open, onOpenChange, branches, activeBranchId, fileName }: Props) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<DiffMode>('branches');

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: '90vw', width: '960px', maxHeight: '90vh' }}>
                <Dialog.Title>
                    <Flex align="center" gap="2">
                        <GitBranch size={18} strokeWidth={2} />
                        {t('diffViewDialog.title', { file: fileName })}
                    </Flex>
                </Dialog.Title>

                <Flex mt="3" mb="1">
                    <SegmentedControl.Root value={mode} onValueChange={v => setMode(v as DiffMode)} size="1">
                        <SegmentedControl.Item value="branches">
                            <Flex align="center" gap="1">
                                <GitBranch size={13} strokeWidth={2} />
                                {t('diffViewDialog.modeBranches')}
                            </Flex>
                        </SegmentedControl.Item>
                        <SegmentedControl.Item value="commits">
                            <Flex align="center" gap="1">
                                <GitCommitHorizontal size={13} strokeWidth={2} />
                                {t('diffViewDialog.modeCommits')}
                            </Flex>
                        </SegmentedControl.Item>
                    </SegmentedControl.Root>
                </Flex>

                {mode === 'branches' && (
                    <BranchDiffPicker branches={branches} activeBranchId={activeBranchId} t={t} />
                )}
                {mode === 'commits' && (
                    <CommitDiffPicker branches={branches} activeBranchId={activeBranchId} t={t} />
                )}

                <Flex justify="end" mt="3">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">{t('diffViewDialog.close')}</Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default DiffViewDialog;
