import { useMemo, useState, useEffect, type ReactElement } from "react";
import { Text, Badge } from "@radix-ui/themes";
import { useTranslation } from 'react-i18next';
import { GitBranch, GitMerge, Tag, Pencil } from "lucide-react";
import { useFileBranches } from "~/hooks/useFileBranches";
import type { FileCommit } from "../../types/file";
import axios from "axios";
import useAuth from "~/hooks/useAuth";

// Internal node for rendering
interface TreeNode {
    id: string;
    shortId: string;
    message: string;
    author: string;
    timestamp: Date;
    branch: string;
    branchId: number;
    type: "commit" | "merge" | "branch-start" | "uncommitted";
}

interface BranchInfo {
    name: string;
    color: string;
    lane: number;
}

// Branch colors
const BRANCH_COLORS: Record<string, string> = {
    main: "#22c55e",
    develop: "#8b5cf6",
    hotfix: "#ef4444",
};

const getBranchColor = (branchName: string): string => {
    if (BRANCH_COLORS[branchName]) return BRANCH_COLORS[branchName];
    let hash = 0;
    for (let i = 0; i < branchName.length; i++) {
        hash = branchName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
};

interface GitTreeProps {
    fileId: string;
    activeBranchId?: number | null;
}

const GitTree = ({ fileId, activeBranchId }: GitTreeProps) => {
    const { t } = useTranslation();
    const { data: branches = [], isLoading: branchesLoading, refetch: refetchBranches } = useFileBranches(fileId, true);

    // Branches carry a `hasUncommittedChanges` flag; the modal is mounted on
    // demand so refetch on mount to make sure that flag reflects the current
    // editor state instead of a stale cache value.
    useEffect(() => {
        refetchBranches();
    }, [refetchBranches]);
    const { bearerToken } = useAuth();
    const [allCommits, setAllCommits] = useState<Map<number, FileCommit[]>>(new Map());
    const [commitsLoading, setCommitsLoading] = useState(false);

    // Fetch commits for all branches
    useEffect(() => {
        if (branches.length === 0 || !bearerToken) return;

        setCommitsLoading(true);
        const baseURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

        Promise.all(
            branches.map(branch =>
                axios.get<FileCommit[]>(`/api/branches/${branch.id}/commits`, {
                    headers: { Authorization: `Bearer ${bearerToken}` },
                    baseURL,
                }).then(res => ({ branchId: branch.id, commits: res.data }))
            )
        ).then(results => {
            const map = new Map<number, FileCommit[]>();
            results.forEach(r => map.set(r.branchId, r.commits));
            setAllCommits(map);
        }).finally(() => setCommitsLoading(false));
    }, [branches, bearerToken]);

    // Build tree nodes
    const treeNodes = useMemo(() => {
        const nodes: TreeNode[] = [];
        const now = new Date();
        branches.forEach(branch => {
            const commits = allCommits.get(branch.id) || [];
            commits.forEach(commit => {
                const msg = commit.message ?? "";
                const isMerge = msg.startsWith("Combined from") || msg.startsWith("Merge from");
                const isBranchStart = msg.startsWith("Created from") || msg.startsWith("Branch created");
                nodes.push({
                    id: `commit-${commit.id}`,
                    shortId: commit.hash || String(commit.id),
                    message: commit.message || "No message",
                    author: commit.committedByName || "Unknown",
                    timestamp: new Date(commit.createdAt),
                    branch: branch.name,
                    branchId: branch.id,
                    type: isMerge ? "merge" : isBranchStart ? "branch-start" : "commit",
                });
            });

            if (branch.hasUncommittedChanges) {
                nodes.push({
                    id: `uncommitted-${branch.id}`,
                    shortId: "WIP",
                    message: "Unsaved changes",
                    author: "",
                    timestamp: now,
                    branch: branch.name,
                    branchId: branch.id,
                    type: "uncommitted",
                });
            }
        });
        return nodes;
    }, [branches, allCommits]);

    // Sort by timestamp descending (newest first)
    const sortedNodes = useMemo(() => {
        return [...treeNodes].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [treeNodes]);

    // Calculate branch lanes
    const { branchInfoMap, laneCount } = useMemo(() => {
        const branchMap = new Map<string, BranchInfo>();
        const activeLanes: Set<number> = new Set();
        let maxLane = 0;

        // Main branch always lane 0
        const mainBranch = branches.find(b => b.name === "main");
        if (mainBranch) {
            branchMap.set(mainBranch.name, {
                name: mainBranch.name,
                color: getBranchColor(mainBranch.name),
                lane: 0,
            });
            activeLanes.add(0);
        }

        // Assign lanes to other branches
        branches.forEach(branch => {
            if (branchMap.has(branch.name)) return;
            let lane = 0;
            while (activeLanes.has(lane)) lane++;
            branchMap.set(branch.name, {
                name: branch.name,
                color: getBranchColor(branch.name),
                lane,
            });
            activeLanes.add(lane);
            maxLane = Math.max(maxLane, lane);
        });

        return { branchInfoMap: branchMap, laneCount: Math.max(maxLane + 1, 1) };
    }, [branches]);

    const isLoading = branchesLoading || commitsLoading;

    if (isLoading) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <Text color="gray">{t('gitTree.loading')}</Text>
            </div>
        );
    }

    if (sortedNodes.length === 0) {
        return (
            <div style={{
                padding: "40px",
                textAlign: "center",
                backgroundColor: "var(--gray-2)",
                borderRadius: "8px",
                border: "2px dashed var(--gray-6)",
            }}>
                <Tag size={48} color="var(--gray-8)" style={{ marginBottom: "16px" }} />
                <Text size="3" weight="medium" style={{ display: "block", marginBottom: "8px" }}>
                    {t('gitTree.noVersions.heading')}
                </Text>
                <Text size="2" color="gray">
                    {t('gitTree.noVersions.description')}
                </Text>
            </div>
        );
    }

    // Layout constants
    const LANE_WIDTH = 24;
    const ROW_HEIGHT = 64;
    const NODE_RADIUS = 8;
    const GRAPH_WIDTH = (laneCount + 1) * LANE_WIDTH + 20;
    const getLaneX = (lane: number) => 20 + lane * LANE_WIDTH;

    const formatTimestamp = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Render SVG branch lines
    const renderBranchLines = (): ReactElement[] => {
        const lines: ReactElement[] = [];

        sortedNodes.forEach((node, index) => {
            const branchInfo = branchInfoMap.get(node.branch);
            if (!branchInfo) return;

            const x = getLaneX(branchInfo.lane);
            const y = index * ROW_HEIGHT + ROW_HEIGHT / 2;

            // Vertical line to next commit on same branch
            const nextOnBranch = sortedNodes.findIndex(
                (c, i) => i > index && c.branch === node.branch
            );
            if (nextOnBranch !== -1) {
                const nextY = nextOnBranch * ROW_HEIGHT + ROW_HEIGHT / 2;
                const isUncommittedLink = node.type === "uncommitted";
                lines.push(
                    <line
                        key={`line-${node.id}`}
                        x1={x} y1={y + NODE_RADIUS}
                        x2={x} y2={nextY - NODE_RADIUS}
                        stroke={branchInfo.color}
                        strokeWidth={2}
                        strokeDasharray={isUncommittedLink ? "4 4" : undefined}
                        opacity={isUncommittedLink ? 0.7 : 1}
                    />
                );
            }

            // Branch creation: curve from source branch
            if (node.type === "branch-start") {
                const match = node.message.match(/from '(.+)'/);
                const sourceBranchName = match?.[1];
                if (sourceBranchName) {
                    const parentBranch = branchInfoMap.get(sourceBranchName);
                    if (parentBranch) {
                        const parentX = getLaneX(parentBranch.lane);
                        const parentCommit = sortedNodes.find(
                            (c, i) => i > index && c.branch === sourceBranchName
                        );
                        if (parentCommit) {
                            const parentIndex = sortedNodes.indexOf(parentCommit);
                            const parentY = parentIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                            lines.push(
                                <path
                                    key={`branch-${node.id}`}
                                    d={`M ${parentX} ${parentY - NODE_RADIUS}
                                        C ${parentX} ${(parentY + y) / 2},
                                          ${x} ${(parentY + y) / 2},
                                          ${x} ${y + NODE_RADIUS}`}
                                    stroke={branchInfo.color}
                                    strokeWidth={2}
                                    fill="none"
                                />
                            );
                        }
                    }
                }
            }

            // Merge line
            if (node.type === "merge") {
                const match = node.message.match(/from '(.+)' into/);
                const sourceBranchName = match?.[1];
                if (sourceBranchName) {
                    const mergedBranch = branchInfoMap.get(sourceBranchName);
                    if (mergedBranch) {
                        const mergedX = getLaneX(mergedBranch.lane);
                        const lastMergedCommit = sortedNodes.find(
                            (c, i) => i > index && c.branch === sourceBranchName
                        );
                        if (lastMergedCommit) {
                            const lastMergedIndex = sortedNodes.indexOf(lastMergedCommit);
                            const lastMergedY = lastMergedIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                            lines.push(
                                <path
                                    key={`merge-${node.id}`}
                                    d={`M ${mergedX} ${lastMergedY - NODE_RADIUS}
                                        C ${mergedX} ${(lastMergedY + y) / 2},
                                          ${x} ${(lastMergedY + y) / 2},
                                          ${x} ${y + NODE_RADIUS}`}
                                    stroke={mergedBranch.color}
                                    strokeWidth={2}
                                    fill="none"
                                />
                            );
                        }
                    }
                }
            }
        });

        return lines;
    };

    // Render SVG commit nodes
    const renderCommitNodes = (): ReactElement[] => {
        return sortedNodes.map((node, index) => {
            const branchInfo = branchInfoMap.get(node.branch);
            if (!branchInfo) return null!;

            const x = getLaneX(branchInfo.lane);
            const y = index * ROW_HEIGHT + ROW_HEIGHT / 2;

            if (node.type === "merge") {
                return (
                    <g key={node.id}>
                        <circle cx={x} cy={y} r={NODE_RADIUS + 2}
                            fill="var(--gray-1)" stroke={branchInfo.color} strokeWidth={3} />
                        <GitMerge x={x - 5} y={y - 5} size={10} color={branchInfo.color} />
                    </g>
                );
            }

            if (node.type === "branch-start") {
                return (
                    <g key={node.id}>
                        <circle cx={x} cy={y} r={NODE_RADIUS + 2}
                            fill="var(--gray-1)" stroke={branchInfo.color} strokeWidth={3} />
                        <GitBranch x={x - 5} y={y - 5} size={10} color={branchInfo.color} />
                    </g>
                );
            }

            if (node.type === "uncommitted") {
                return (
                    <g key={node.id}>
                        <circle cx={x} cy={y} r={NODE_RADIUS + 2}
                            fill="var(--gray-1)" stroke={branchInfo.color} strokeWidth={2}
                            strokeDasharray="3 2" />
                        <Pencil x={x - 5} y={y - 5} size={10} color={branchInfo.color} />
                    </g>
                );
            }

            return (
                <g key={node.id}>
                    <circle cx={x} cy={y} r={NODE_RADIUS + 1}
                        fill="var(--gray-1)" stroke={branchInfo.color} strokeWidth={3} />
                    <Tag x={x - 4} y={y - 4} size={8} color={branchInfo.color} />
                </g>
            );
        });
    };

    return (
        <div style={{ display: "flex", position: "relative", overflow: "auto", maxHeight: "500px" }}>
            {/* SVG Graph */}
            <svg
                width={GRAPH_WIDTH}
                height={sortedNodes.length * ROW_HEIGHT}
                style={{ flexShrink: 0 }}
            >
                {renderBranchLines()}
                {renderCommitNodes()}
            </svg>

            {/* Commit Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {sortedNodes.map((node) => {
                    const branchInfo = branchInfoMap.get(node.branch);
                    const isUncommitted = node.type === "uncommitted";

                    return (
                        <div
                            key={node.id}
                            style={{
                                height: ROW_HEIGHT,
                                display: "flex",
                                alignItems: "center",
                                padding: "8px 16px 8px 8px",
                                opacity: isUncommitted ? 0.85 : 1,
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    marginBottom: "4px",
                                }}>
                                    <Text size="2" weight="medium" style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        fontStyle: isUncommitted ? "italic" : undefined,
                                        color: isUncommitted ? "var(--gray-11)" : undefined,
                                    }}>
                                        {node.message}
                                    </Text>
                                    {node.type === "merge" && (
                                        <Badge size="1" color="purple">{t('gitTree.badges.combine')}</Badge>
                                    )}
                                    {node.type === "branch-start" && (
                                        <Badge size="1" color="blue">{t('gitTree.badges.newVariant')}</Badge>
                                    )}
                                    {node.type === "commit" && (
                                        <Badge size="1" color="green">{t('gitTree.badges.version')}</Badge>
                                    )}
                                    {isUncommitted && (
                                        <Badge size="1" color="orange" variant="soft">{t('gitTree.badges.unsaved')}</Badge>
                                    )}
                                </div>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                }}>
                                    <Text size="1" style={{
                                        fontFamily: "monospace",
                                        color: branchInfo?.color,
                                        fontWeight: 500,
                                    }}>
                                        #{node.shortId}
                                    </Text>
                                    {node.author && (
                                        <Text size="1" color="gray">{node.author}</Text>
                                    )}
                                    <Text size="1" color="gray">
                                        {formatTimestamp(node.timestamp)}
                                    </Text>
                                </div>
                            </div>
                            <Badge size="1" style={{
                                backgroundColor: branchInfo?.color,
                                color: "white",
                                flexShrink: 0,
                            }}>
                                {node.branch}
                            </Badge>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GitTree;
