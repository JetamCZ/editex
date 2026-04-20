import {useMemo, useState} from "react";
import { useTranslation } from 'react-i18next';
import {
    Avatar,
    Badge,
    Box,
    Button,
    Callout,
    Dialog,
    Flex,
    IconButton,
    Select,
    Separator,
    Text,
    TextField,
} from "@radix-ui/themes";
import {ExclamationTriangleIcon} from "@radix-ui/react-icons";
import {Trash2, Lock, ArrowUpFromLine} from "lucide-react";
import {Link} from "react-router";
import getInitials from "~/lib/getInitials";
import {FolderRole, roleIncludes, type ProjectFolder} from "../../types/permission";
import {
    useFolderPermissions,
    useGrantPermission,
    useRevokePermission,
    useUpdatePermission,
} from "~/hooks/useFolderPermissions";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    folder: ProjectFolder | null;
    projectId: number;
    projectSlug: string;
}

function roleColor(role: FolderRole) {
    switch (role) {
        case FolderRole.MANAGER: return "purple";
        case FolderRole.EDITOR: return "blue";
        case FolderRole.VIEWER: return "gray";
    }
}

export default function FolderAccessModal({open, onOpenChange, folder, projectId, projectSlug}: Props) {
    const { t } = useTranslation();
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<FolderRole>(FolderRole.VIEWER);

    const folderId = folder?.id ?? null;
    const {data: permissions, isLoading} = useFolderPermissions(folderId);
    const grant = useGrantPermission(folderId);
    const update = useUpdatePermission(folderId);
    const revoke = useRevokePermission(folderId);

    const canManage = roleIncludes(folder?.effectiveRole, FolderRole.MANAGER);

    const sorted = useMemo(() => {
        if (!permissions) return [];
        return [...permissions].sort((a, b) => {
            if (a.inherited !== b.inherited) return a.inherited ? 1 : -1;
            return a.userName.localeCompare(b.userName);
        });
    }, [permissions]);

    const handleGrant = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        grant.mutate(
            {email: inviteEmail.trim(), role: inviteRole},
            {
                onSuccess: () => {
                    setInviteEmail("");
                    setInviteRole(FolderRole.VIEWER);
                },
            }
        );
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content maxWidth="560px">
                <Dialog.Title>
                    <Flex align="center" gap="2">
                        <Lock size={16} />
                        {t('folderAccess.title', { path: folder?.path ?? "" })}
                    </Flex>
                </Dialog.Title>
                <Dialog.Description size="2" mb="4" color="gray">
                    {t('folderAccess.description')}
                </Dialog.Description>

                {canManage && (
                    <Box mb="4">
                        <Text size="2" weight="bold" mb="2" as="div">{t('folderAccess.grantHeading')}</Text>
                        <form onSubmit={handleGrant}>
                            <Flex gap="2">
                                <Box style={{flex: 1}}>
                                    <TextField.Root
                                        type="email"
                                        placeholder={t('folderAccess.emailPlaceholder')}
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        required
                                    />
                                </Box>
                                <Select.Root
                                    value={inviteRole}
                                    onValueChange={(v) => setInviteRole(v as FolderRole)}
                                >
                                    <Select.Trigger style={{width: 130}} />
                                    <Select.Content>
                                        <Select.Item value={FolderRole.VIEWER}>{t('common.viewer')}</Select.Item>
                                        <Select.Item value={FolderRole.EDITOR}>{t('common.editor')}</Select.Item>
                                        <Select.Item value={FolderRole.MANAGER}>{t('common.manager')}</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                                <Button type="submit" disabled={grant.isPending}>
                                    {grant.isPending ? t('folderAccess.granting') : t('folderAccess.grant')}
                                </Button>
                            </Flex>
                            {grant.isError && (
                                <Callout.Root color="red" mt="2" size="1">
                                    <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
                                    <Callout.Text>
                                        {(grant.error as any)?.response?.data?.message
                                            || (grant.error as any)?.message
                                            || t('folderAccess.failedToGrant')}
                                    </Callout.Text>
                                </Callout.Root>
                            )}
                        </form>
                        <Separator my="3" size="4" />
                    </Box>
                )}

                <Text size="2" weight="bold" mb="2" as="div">
                    {t('folderAccess.effectiveAccess', { count: sorted.length })}
                </Text>

                {isLoading && <Text size="2" color="gray">{t('folderAccess.loading')}</Text>}

                {!isLoading && sorted.length === 0 && (
                    <Text size="2" color="gray">{t('folderAccess.noGrants')}</Text>
                )}

                <Flex direction="column" gap="2">
                    {sorted.map((p) => (
                        <Flex
                            key={`${p.userId}-${p.sourceFolderId}`}
                            align="center"
                            gap="3"
                            p="2"
                            style={{
                                border: "1px solid var(--gray-a5)",
                                borderRadius: 6,
                                opacity: p.inherited ? 0.7 : 1,
                            }}
                        >
                            <Avatar size="2" radius="full" fallback={getInitials(p.userName ?? p.userEmail)} />
                            <Box style={{flex: 1, minWidth: 0}}>
                                <Text as="div" size="2" weight="bold" truncate>
                                    {p.userName || p.userEmail}
                                </Text>
                                <Text as="div" size="1" color="gray" truncate>
                                    {p.userEmail}
                                </Text>
                                {p.inherited && (
                                    <Flex align="center" gap="1" mt="1">
                                        <ArrowUpFromLine size={10} />
                                        <Text size="1" color="gray">
                                            {t('folderAccess.inheritedFrom', { path: p.sourceFolderPath })}
                                        </Text>
                                    </Flex>
                                )}
                            </Box>

                            {canManage && !p.inherited && p.id !== null ? (
                                <>
                                    <Select.Root
                                        value={p.role}
                                        onValueChange={(v) =>
                                            update.mutate({userId: p.userId, role: v as FolderRole})
                                        }
                                    >
                                        <Select.Trigger style={{width: 110}} color={roleColor(p.role)} />
                                        <Select.Content>
                                            <Select.Item value={FolderRole.VIEWER}>{t('common.viewer')}</Select.Item>
                                            <Select.Item value={FolderRole.EDITOR}>{t('common.editor')}</Select.Item>
                                            <Select.Item value={FolderRole.MANAGER}>{t('common.manager')}</Select.Item>
                                        </Select.Content>
                                    </Select.Root>
                                    <IconButton
                                        size="2"
                                        variant="soft"
                                        color="red"
                                        onClick={() => revoke.mutate(p.userId)}
                                        aria-label="Revoke access"
                                    >
                                        <Trash2 size={14} />
                                    </IconButton>
                                </>
                            ) : (
                                <Badge color={roleColor(p.role)}>{p.role}</Badge>
                            )}
                        </Flex>
                    ))}
                </Flex>

                <Flex gap="2" mt="4" justify="between" align="center">
                    {folder && (
                        <Button asChild variant="ghost" size="2">
                            <Link
                                to={`/project/${projectSlug}/settings/permissions?folder=${folder.id}`}
                            >
                                {t('folderAccess.openPermissions')}
                            </Link>
                        </Button>
                    )}
                    <Dialog.Close>
                        <Button variant="soft">{t('folderAccess.close')}</Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
