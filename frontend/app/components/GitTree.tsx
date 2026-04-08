import { useMemo } from 'react';
import { Text, Flex, Badge, Tooltip } from '@radix-ui/themes';
import { GitBranch, GitCommit, Circle } from 'lucide-react';
import { useFileBranches, useBranchCommits } from '~/hooks/useFileBranches';
import type { FileBranch, FileCommit } from '../../types/file';

interface Props {
    fileId: string;
    activeBranchId?: string | null;
}

// Colors for different branches
const BRANCH_COLORS = [
    { line: 'var(--blue-9)', dot: 'var(--blue-9)', bg: 'var(--blue-2)', text: 'var(--blue-11)' },
    { line: 'var(--green-9)', dot: 'var(--green-9)', bg: 'var(--green-2)', text: 'var(--green-11)' },
    { line: 'var(--orange-9)', dot: 'var(--orange-9)', bg: 'var(--orange-2)', text: 'var(--orange-11)' },
    { line: 'var(--purple-9)', dot: 'var(--purple-9)', bg: 'var(--purple-2)', text: 'var(--purple-11)' },
    { line: 'var(--red-9)', dot: 'var(--red-9)', bg: 'var(--red-2)', text: 'var(--red-11)' },
    { line: 'var(--cyan-9)', dot: 'var(--cyan-9)', bg: 'var(--cyan-2)', text: 'var(--cyan-11)' },
];

const GitTree = ({ fileId, activeBranchId }: Props) => {
    const { data: branches = [], isLoading: branchesLoading } = useFileBranches(fileId);

    if (branchesLoading) {
        return <Text size="2" color="gray" style={{ padding: '16px 0' }}>Loading...</Text>;
    }

    if (branches.length === 0) {
        return <Text size="2" color="gray" style={{ padding: '16px 0' }}>No branches</Text>;
    }

    // Sort: active branch first, then main, then rest
    const sortedBranches = [...branches].sort((a, b) => {
        if (a.id === activeBranchId) return -1;
        if (b.id === activeBranchId) return 1;
        if (a.name === 'main') return -1;
        if (b.name === 'main') return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div style={{ marginTop: '12px' }}>
            {sortedBranches.map((branch, index) => (
                <BranchLane
                    key={branch.id}
                    branch={branch}
                    colorIndex={index}
                    isActive={branch.id === activeBranchId}
                    allBranches={sortedBranches}
                />
            ))}
        </div>
    );
};

function BranchLane({ branch, colorIndex, isActive, allBranches }: {
    branch: FileBranch;
    colorIndex: number;
    isActive: boolean;
    allBranches: FileBranch[];
}) {
    const { data: commits = [], isLoading } = useBranchCommits(branch.id);
    const color = BRANCH_COLORS[colorIndex % BRANCH_COLORS.length];

    // Find source branch for fork indicator
    const sourceBranch = branch.sourceBranchName
        ? allBranches.find(b => b.name === branch.sourceBranchName)
        : null;
    const sourceColor = sourceBranch
        ? BRANCH_COLORS[allBranches.indexOf(sourceBranch) % BRANCH_COLORS.length]
        : null;

    return (
        <div style={{ marginBottom: '4px' }}>
            {/* Branch header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 0',
            }}>
                {/* Graph line element */}
                <div style={{
                    width: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0,
                }}>
                    {/* Vertical line continuing from above if not first */}
                    <div style={{
                        width: '2px',
                        height: '100%',
                        backgroundColor: color.line,
                        position: 'absolute',
                        top: commits.length > 0 ? 0 : '50%',
                        bottom: 0,
                    }} />
                    {/* Branch dot */}
                    <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: color.dot,
                        border: isActive ? '3px solid var(--gray-1)' : 'none',
                        boxShadow: isActive ? `0 0 0 2px ${color.dot}` : 'none',
                        zIndex: 1,
                        flexShrink: 0,
                    }} />
                </div>

                {/* Branch name + badges */}
                <Flex align="center" gap="2" style={{ flex: 1, minWidth: 0 }}>
                    <GitBranch size={14} strokeWidth={2} style={{ color: color.dot, flexShrink: 0 }} />
                    <Text size="2" weight="bold" style={{ color: color.text }}>
                        {branch.name}
                    </Text>
                    {isActive && (
                        <Badge size="1" color="blue" variant="soft">active</Badge>
                    )}
                    {branch.sourceBranchName && (
                        <Tooltip content={`Branched from ${branch.sourceBranchName}`}>
                            <Text size="1" color="gray" style={{ cursor: 'default' }}>
                                from {branch.sourceBranchName}
                            </Text>
                        </Tooltip>
                    )}
                    <Text size="1" color="gray" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        {commits.length} commit{commits.length !== 1 ? 's' : ''}
                    </Text>
                </Flex>
            </div>

            {/* Commits */}
            {isLoading ? (
                <div style={{ paddingLeft: '40px' }}>
                    <Text size="1" color="gray">Loading commits...</Text>
                </div>
            ) : (
                commits.map((commit, i) => (
                    <CommitNode
                        key={commit.id}
                        commit={commit}
                        color={color}
                        isLast={i === commits.length - 1}
                        isMerge={commit.message?.startsWith('Merge from') ?? false}
                        isBranchStart={commit.message?.startsWith('Branch created') ?? false}
                    />
                ))
            )}

            {/* Empty state for branches with no commits */}
            {!isLoading && commits.length === 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingLeft: '40px',
                    paddingBottom: '8px',
                }}>
                    <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>
                        No commits yet - changes are tracked incrementally
                    </Text>
                </div>
            )}
        </div>
    );
}

function CommitNode({ commit, color, isLast, isMerge, isBranchStart }: {
    commit: FileCommit;
    color: typeof BRANCH_COLORS[0];
    isLast: boolean;
    isMerge: boolean;
    isBranchStart: boolean;
}) {
    const timeAgo = useMemo(() => formatTimeAgo(commit.createdAt), [commit.createdAt]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            minHeight: '36px',
        }}>
            {/* Graph column */}
            <div style={{
                width: '40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
                position: 'relative',
                alignSelf: 'stretch',
            }}>
                {/* Vertical line top half */}
                <div style={{
                    width: '2px',
                    flex: 1,
                    backgroundColor: color.line,
                    opacity: 0.4,
                }} />
                {/* Commit dot */}
                <div style={{
                    width: isMerge ? '10px' : '8px',
                    height: isMerge ? '10px' : '8px',
                    borderRadius: isMerge ? '2px' : '50%',
                    backgroundColor: isMerge ? color.dot : 'var(--gray-1)',
                    border: `2px solid ${color.line}`,
                    flexShrink: 0,
                    transform: isMerge ? 'rotate(45deg)' : 'none',
                }} />
                {/* Vertical line bottom half */}
                <div style={{
                    width: '2px',
                    flex: 1,
                    backgroundColor: isLast ? 'transparent' : color.line,
                    opacity: 0.4,
                }} />
            </div>

            {/* Commit info */}
            <div style={{
                flex: 1,
                padding: '4px 0',
                minWidth: 0,
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}>
                    <Text size="2" weight="medium" style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: commit.message ? 'var(--gray-12)' : 'var(--gray-9)',
                    }}>
                        {commit.message || 'No message'}
                    </Text>
                </div>
                <Flex gap="2" mt="1" align="center">
                    <Text size="1" color="gray">{commit.committedByName}</Text>
                    <Text size="1" style={{ color: 'var(--gray-7)' }}>
                        {timeAgo}
                    </Text>
                    <Text size="1" style={{
                        color: 'var(--gray-8)',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                    }}>
                        #{commit.id}
                    </Text>
                </Flex>
            </div>
        </div>
    );
}

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default GitTree;
