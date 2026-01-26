import { Dialog, Button, Text, Badge, ScrollArea, Tabs } from "@radix-ui/themes";
import { FileText, Plus, Minus, X } from "lucide-react";
import type { FileDiff } from "../../types/commit";

interface DiffPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    diffs: FileDiff[];
    isLoading: boolean;
    onConfirmDiscard: () => void;
    isDiscarding: boolean;
}

// Simple diff computation
function computeLineDiff(oldContent: string, newContent: string) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const result: Array<{
        type: 'unchanged' | 'added' | 'removed';
        content: string;
        oldLineNum?: number;
        newLineNum?: number;
    }> = [];

    // Simple LCS-based diff
    const lcs = computeLCS(oldLines, newLines);

    let oldIdx = 0;
    let newIdx = 0;
    let lcsIdx = 0;

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
        if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
            if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
                // Unchanged line
                result.push({
                    type: 'unchanged',
                    content: oldLines[oldIdx],
                    oldLineNum: oldIdx + 1,
                    newLineNum: newIdx + 1
                });
                oldIdx++;
                newIdx++;
                lcsIdx++;
            } else {
                // Added line in new
                result.push({
                    type: 'added',
                    content: newLines[newIdx],
                    newLineNum: newIdx + 1
                });
                newIdx++;
            }
        } else if (oldIdx < oldLines.length) {
            // Removed line from old
            result.push({
                type: 'removed',
                content: oldLines[oldIdx],
                oldLineNum: oldIdx + 1
            });
            oldIdx++;
        } else if (newIdx < newLines.length) {
            // Added line in new
            result.push({
                type: 'added',
                content: newLines[newIdx],
                newLineNum: newIdx + 1
            });
            newIdx++;
        }
    }

    return result;
}

function computeLCS(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            lcs.unshift(a[i - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }

    return lcs;
}

const DiffPreviewDialog = ({
    open,
    onOpenChange,
    diffs,
    isLoading,
    onConfirmDiscard,
    isDiscarding
}: DiffPreviewDialogProps) => {
    const totalAdditions = diffs.reduce((sum, diff) => {
        const lines = computeLineDiff(diff.oldContent, diff.newContent);
        return sum + lines.filter(l => l.type === 'added').length;
    }, 0);

    const totalDeletions = diffs.reduce((sum, diff) => {
        const lines = computeLineDiff(diff.oldContent, diff.newContent);
        return sum + lines.filter(l => l.type === 'removed').length;
    }, 0);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: 900, maxHeight: '85vh' }}>
                <Dialog.Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileText size={20} />
                        Preview Changes to Discard
                    </div>
                </Dialog.Title>
                <Dialog.Description size="2" color="gray">
                    Review the changes that will be reverted. This action cannot be undone and affects all users.
                </Dialog.Description>

                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Text color="gray">Loading changes...</Text>
                    </div>
                ) : diffs.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Text color="gray">No uncommitted changes found.</Text>
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        <div style={{
                            display: 'flex',
                            gap: '16px',
                            marginTop: '16px',
                            marginBottom: '16px',
                            padding: '12px',
                            backgroundColor: 'var(--gray-2)',
                            borderRadius: '8px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={14} />
                                <Text size="2" weight="medium">{diffs.length} file{diffs.length !== 1 ? 's' : ''} changed</Text>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--green-11)' }}>
                                <Plus size={14} />
                                <Text size="2" weight="medium">{totalAdditions} addition{totalAdditions !== 1 ? 's' : ''}</Text>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red-11)' }}>
                                <Minus size={14} />
                                <Text size="2" weight="medium">{totalDeletions} deletion{totalDeletions !== 1 ? 's' : ''}</Text>
                            </div>
                        </div>

                        {/* File tabs */}
                        <Tabs.Root defaultValue={diffs[0]?.fileId}>
                            <Tabs.List>
                                {diffs.map(diff => (
                                    <Tabs.Trigger key={diff.fileId} value={diff.fileId}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <FileText size={12} />
                                            {diff.fileName}
                                            <Badge size="1" color="orange">{diff.changeCount}</Badge>
                                        </span>
                                    </Tabs.Trigger>
                                ))}
                            </Tabs.List>

                            {diffs.map(diff => {
                                const lines = computeLineDiff(diff.oldContent, diff.newContent);
                                return (
                                    <Tabs.Content key={diff.fileId} value={diff.fileId}>
                                        <ScrollArea style={{ height: '400px', marginTop: '12px' }}>
                                            <div style={{
                                                fontFamily: 'monospace',
                                                fontSize: '12px',
                                                lineHeight: '1.5',
                                                backgroundColor: 'var(--gray-1)',
                                                border: '1px solid var(--gray-6)',
                                                borderRadius: '6px',
                                                overflow: 'hidden'
                                            }}>
                                                {lines.map((line, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            display: 'flex',
                                                            backgroundColor: line.type === 'added'
                                                                ? 'var(--green-3)'
                                                                : line.type === 'removed'
                                                                    ? 'var(--red-3)'
                                                                    : 'transparent',
                                                            borderLeft: line.type === 'added'
                                                                ? '3px solid var(--green-9)'
                                                                : line.type === 'removed'
                                                                    ? '3px solid var(--red-9)'
                                                                    : '3px solid transparent'
                                                        }}
                                                    >
                                                        <span style={{
                                                            width: '40px',
                                                            padding: '0 8px',
                                                            textAlign: 'right',
                                                            color: 'var(--gray-9)',
                                                            backgroundColor: 'var(--gray-3)',
                                                            userSelect: 'none',
                                                            flexShrink: 0
                                                        }}>
                                                            {line.oldLineNum || ''}
                                                        </span>
                                                        <span style={{
                                                            width: '40px',
                                                            padding: '0 8px',
                                                            textAlign: 'right',
                                                            color: 'var(--gray-9)',
                                                            backgroundColor: 'var(--gray-3)',
                                                            userSelect: 'none',
                                                            flexShrink: 0
                                                        }}>
                                                            {line.newLineNum || ''}
                                                        </span>
                                                        <span style={{
                                                            width: '20px',
                                                            textAlign: 'center',
                                                            color: line.type === 'added'
                                                                ? 'var(--green-11)'
                                                                : line.type === 'removed'
                                                                    ? 'var(--red-11)'
                                                                    : 'var(--gray-9)',
                                                            fontWeight: 'bold',
                                                            userSelect: 'none',
                                                            flexShrink: 0
                                                        }}>
                                                            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                                                        </span>
                                                        <span style={{
                                                            flex: 1,
                                                            padding: '0 8px',
                                                            whiteSpace: 'pre',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {line.content}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </Tabs.Content>
                                );
                            })}
                        </Tabs.Root>
                    </>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            Cancel
                        </Button>
                    </Dialog.Close>
                    <Button
                        color="red"
                        onClick={onConfirmDiscard}
                        disabled={isDiscarding || diffs.length === 0}
                    >
                        <X size={14} />
                        {isDiscarding ? 'Discarding...' : 'Discard All Changes'}
                    </Button>
                </div>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default DiffPreviewDialog;
