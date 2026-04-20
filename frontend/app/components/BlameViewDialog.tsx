import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Flex, Text, Spinner, Tooltip } from '@radix-ui/themes';
import { useBranchBlame, useBranchContent } from '~/hooks/useFileBranches';
import type { BlameEntry } from '~/hooks/useFileBranches';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    branchId: number | undefined;
    branchName: string;
    fileName: string;
}

const USER_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
];

function userColor(userId: number | null, userMap: Map<number, number>): string {
    if (userId === null) return 'var(--gray-5)';
    if (!userMap.has(userId)) {
        userMap.set(userId, userMap.size % USER_COLORS.length);
    }
    return USER_COLORS[userMap.get(userId)!];
}

function initials(name: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const BlameViewDialog = ({ open, onOpenChange, branchId, branchName, fileName }: Props) => {
    const { t } = useTranslation();
    const bid = branchId ?? null;
    const { data: blame, isFetching: blameFetching, isError: blameError } = useBranchBlame(bid);
    const { data: content, isFetching: contentFetching } = useBranchContent(bid);

    const userMap = useMemo(() => new Map<number, number>(), [blame]);
    const codeLines = useMemo(() => content ? content.split('\n') : [], [content]);

    const isFetching = blameFetching || contentFetching;

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: '900px', width: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <Dialog.Title>
                    {t('blameViewDialog.title', { file: fileName, branch: branchName })}
                </Dialog.Title>
                <Dialog.Description size="2" color="gray">
                    {t('blameViewDialog.description')}
                </Dialog.Description>

                <div style={{ flex: 1, overflow: 'auto', marginTop: '12px', border: '1px solid var(--gray-5)', borderRadius: '6px' }}>
                    {isFetching && (
                        <Flex align="center" justify="center" style={{ padding: '48px' }}>
                            <Spinner size="3" />
                        </Flex>
                    )}
                    {blameError && (
                        <Flex align="center" justify="center" style={{ padding: '48px' }}>
                            <Text size="2" color="red">{t('blameViewDialog.error')}</Text>
                        </Flex>
                    )}
                    {!isFetching && !blameError && blame && blame.length === 0 && (
                        <Flex align="center" justify="center" style={{ padding: '48px' }}>
                            <Text size="2" color="gray">{t('blameViewDialog.empty')}</Text>
                        </Flex>
                    )}
                    {!isFetching && blame && blame.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
                            <colgroup>
                                <col style={{ width: '44px' }} />
                                <col style={{ width: '180px' }} />
                                <col />
                            </colgroup>
                            <tbody>
                                {blame.map((entry: BlameEntry) => {
                                    const color = userColor(entry.userId, userMap);
                                    const codeLine = codeLines[entry.lineNumber - 1] ?? '';
                                    const tooltip = entry.userName
                                        ? `${entry.userName}${entry.timestamp ? ' — ' + new Date(entry.timestamp).toLocaleString() : ''}`
                                        : t('blameViewDialog.unknownAuthor');
                                    return (
                                        <tr
                                            key={entry.lineNumber}
                                            style={{ borderBottom: '1px solid var(--gray-3)' }}
                                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--gray-2)')}
                                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                                        >
                                            {/* Line number */}
                                            <td style={{
                                                padding: '1px 8px',
                                                color: 'var(--gray-9)',
                                                textAlign: 'right',
                                                userSelect: 'none',
                                                borderRight: '1px solid var(--gray-4)',
                                                backgroundColor: 'var(--gray-1)',
                                                fontSize: '11px',
                                            }}>
                                                {entry.lineNumber}
                                            </td>

                                            {/* Blame info */}
                                            <Tooltip content={tooltip}>
                                                <td style={{
                                                    padding: '1px 8px',
                                                    borderRight: '1px solid var(--gray-4)',
                                                    backgroundColor: 'var(--gray-1)',
                                                    cursor: 'default',
                                                    overflow: 'hidden',
                                                }}>
                                                    <Flex align="center" gap="1">
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '16px',
                                                            height: '16px',
                                                            borderRadius: '50%',
                                                            backgroundColor: color,
                                                            color: '#fff',
                                                            fontSize: '8px',
                                                            fontWeight: 700,
                                                            flexShrink: 0,
                                                        }}>
                                                            {initials(entry.userName)}
                                                        </span>
                                                        <span style={{ color: 'var(--gray-10)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {entry.userName ?? '—'}
                                                        </span>
                                                        {entry.timestamp && (
                                                            <span style={{ color: 'var(--gray-7)', fontSize: '10px', whiteSpace: 'nowrap', marginLeft: '4px' }}>
                                                                {new Date(entry.timestamp).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </Flex>
                                                </td>
                                            </Tooltip>

                                            {/* Code line */}
                                            <td style={{
                                                padding: '1px 8px',
                                                whiteSpace: 'pre',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                color: 'var(--gray-12)',
                                            }}>
                                                {codeLine}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <Flex justify="end" mt="3">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">{t('blameViewDialog.close')}</Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default BlameViewDialog;
