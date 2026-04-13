import {useEffect, useMemo, useState} from "react";
import {Link, useNavigate, useOutletContext, useSearchParams} from "react-router";
import {createPortal} from "react-dom";
import {
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    Flex,
    Heading,
    Select,
    Separator,
    Text,
    Tooltip,
} from "@radix-ui/themes";
import {ArrowLeft, Lock, Folder as FolderIcon, ChevronRight} from "lucide-react";
import type {Project} from "../../../types/project";
import {FolderRole, type ProjectFolder, roleIncludes} from "../../../types/permission";
import {useAccessSummary, useFolderPermissions} from "~/hooks/useFolderPermissions";
import FolderAccessModal from "~/components/FolderAccessModal";
import getInitials from "~/lib/getInitials";

export function meta({matches}: {matches: Array<{data?: {project?: Project}}>}) {
    const projectName = matches.find(m => m.data?.project)?.data?.project?.name || "Project";
    return [{title: `Permissions - ${projectName} - Editex`}];
}

interface OutletContextType {
    project: Project;
}

function roleColor(role: FolderRole | null | undefined) {
    switch (role) {
        case FolderRole.MANAGER: return "purple";
        case FolderRole.EDITOR: return "blue";
        case FolderRole.VIEWER: return "gray";
        default: return "gray";
    }
}

interface FolderTreeItem extends ProjectFolder {
    depth: number;
}

function flattenFolderTree(folders: ProjectFolder[]): FolderTreeItem[] {
    if (!folders || folders.length === 0) return [];
    const byParent = new Map<number | null, ProjectFolder[]>();
    folders.forEach(f => {
        const key = f.parentId ?? null;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(f);
    });
    byParent.forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));

    const result: FolderTreeItem[] = [];
    const walk = (parentId: number | null, depth: number) => {
        for (const f of byParent.get(parentId) ?? []) {
            result.push({...f, depth});
            walk(f.id, depth + 1);
        }
    };
    walk(null, 0);
    return result;
}

const PermissionsPage = () => {
    const {project} = useOutletContext<OutletContextType>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [headerActionsContainer, setHeaderActionsContainer] = useState<HTMLElement | null>(null);
    useEffect(() => {
        setHeaderActionsContainer(document.getElementById("header-actions"));
    }, []);

    const {data: summary, isLoading} = useAccessSummary(project.baseProject);

    const folderTree = useMemo(() => flattenFolderTree(summary?.folders ?? []), [summary]);

    const initialFolderId = searchParams.get("folder") ? Number(searchParams.get("folder")) : null;
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(initialFolderId);

    useEffect(() => {
        if (selectedFolderId == null && folderTree.length > 0) {
            const root = folderTree.find(f => f.parentId === null) ?? folderTree[0];
            setSelectedFolderId(root.id);
        }
    }, [folderTree, selectedFolderId]);

    const selectedFolder = useMemo(
        () => folderTree.find(f => f.id === selectedFolderId) ?? null,
        [folderTree, selectedFolderId]
    );

    const {data: permissions = []} = useFolderPermissions(selectedFolderId);

    const [accessModalFolder, setAccessModalFolder] = useState<ProjectFolder | null>(null);

    const canManageRoot = roleIncludes(project.userRole, FolderRole.MANAGER);

    const headerActions = headerActionsContainer && createPortal(
        <Button
            size="2"
            variant="soft"
            onClick={() => navigate(`/project/${project.baseProject}/${project.branch}/settings`)}
        >
            <ArrowLeft size={14} /> Back to Settings
        </Button>,
        headerActionsContainer
    );

    const handleSelectFolder = (id: number) => {
        setSelectedFolderId(id);
        setSearchParams({folder: String(id)});
    };

    return (
        <>
            {headerActions}

            <Box className="flex-1 bg-gray-1 overflow-auto">
                <Box className="py-8 px-6 max-w-6xl mx-auto">
                    <Flex direction="column" gap="2" mb="6">
                        <Flex align="center" gap="2">
                            <Lock size={20} />
                            <Heading size="8">Permissions</Heading>
                        </Flex>
                        <Text size="3" color="gray">
                            Grants on a folder cascade into every subfolder. The project owner
                            always has implicit MANAGER on the project root.
                        </Text>
                    </Flex>

                    {isLoading && <Text size="2" color="gray">Loading…</Text>}

                    {!isLoading && summary && (
                        <Flex gap="4" align="start">
                            {/* Folder tree */}
                            <Card style={{width: 320, flexShrink: 0, maxHeight: "70vh", overflow: "auto"}}>
                                <Heading size="3" mb="3">Folders</Heading>
                                <Flex direction="column" gap="1">
                                    {folderTree.map(folder => {
                                        const selected = folder.id === selectedFolderId;
                                        return (
                                            <button
                                                key={folder.id}
                                                onClick={() => handleSelectFolder(folder.id)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                    padding: "6px 8px",
                                                    paddingLeft: 8 + folder.depth * 16,
                                                    background: selected ? "var(--accent-3)" : "transparent",
                                                    borderRadius: 4,
                                                    border: "none",
                                                    cursor: "pointer",
                                                    textAlign: "left",
                                                    width: "100%",
                                                    color: selected ? "var(--accent-11)" : "var(--gray-12)",
                                                }}
                                            >
                                                {folder.depth > 0 && <ChevronRight size={10} />}
                                                <FolderIcon size={14} />
                                                <Text size="2" style={{flex: 1, overflow: "hidden", textOverflow: "ellipsis"}}>
                                                    {folder.parentId === null ? "/" : folder.name}
                                                </Text>
                                                {folder.hasExplicitGrants && (
                                                    <Tooltip content="Has explicit grants">
                                                        <Lock size={10} color="var(--purple-11)" />
                                                    </Tooltip>
                                                )}
                                            </button>
                                        );
                                    })}
                                </Flex>
                            </Card>

                            {/* Folder details */}
                            <Card style={{flex: 1}}>
                                {selectedFolder ? (
                                    <>
                                        <Flex justify="between" align="start" mb="4">
                                            <Box>
                                                <Heading size="4" style={{fontFamily: "monospace"}}>
                                                    {selectedFolder.path}
                                                </Heading>
                                                <Text size="2" color="gray">
                                                    Your effective role:{" "}
                                                    <Badge color={roleColor(selectedFolder.effectiveRole)}>
                                                        {selectedFolder.effectiveRole ?? "—"}
                                                    </Badge>
                                                </Text>
                                            </Box>
                                            {canManageRoot && (
                                                <Button onClick={() => setAccessModalFolder(selectedFolder)}>
                                                    Edit access
                                                </Button>
                                            )}
                                        </Flex>

                                        <Separator size="4" mb="4" />

                                        <Heading size="3" mb="3">Effective access ({permissions.length})</Heading>
                                        {permissions.length === 0 && (
                                            <Text size="2" color="gray">No grants on this folder.</Text>
                                        )}
                                        <Flex direction="column" gap="2">
                                            {permissions
                                                .slice()
                                                .sort((a, b) => Number(a.inherited) - Number(b.inherited))
                                                .map(p => (
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
                                                        <Avatar
                                                            size="2"
                                                            radius="full"
                                                            fallback={getInitials(p.userName ?? p.userEmail)}
                                                        />
                                                        <Box style={{flex: 1, minWidth: 0}}>
                                                            <Text as="div" size="2" weight="bold" truncate>
                                                                {p.userName || p.userEmail}
                                                            </Text>
                                                            <Text as="div" size="1" color="gray" truncate>
                                                                {p.userEmail}
                                                            </Text>
                                                            {p.inherited && (
                                                                <Text as="div" size="1" color="gray">
                                                                    inherited from <code>{p.sourceFolderPath}</code>
                                                                </Text>
                                                            )}
                                                        </Box>
                                                        <Badge color={roleColor(p.role)}>{p.role}</Badge>
                                                    </Flex>
                                                ))}
                                        </Flex>
                                    </>
                                ) : (
                                    <Text color="gray">Select a folder to inspect its permissions.</Text>
                                )}
                            </Card>
                        </Flex>
                    )}
                </Box>
            </Box>

            <FolderAccessModal
                open={!!accessModalFolder}
                onOpenChange={(open) => !open && setAccessModalFolder(null)}
                folder={accessModalFolder}
                baseProject={project.baseProject}
                branch={project.branch}
            />
        </>
    );
};

export default PermissionsPage;
