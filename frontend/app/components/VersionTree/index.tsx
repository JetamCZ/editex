import { useMemo, type ReactElement } from "react";
import { Text, Badge } from "@radix-ui/themes";
import { GitBranch, GitMerge, Tag } from "lucide-react";
import type { Commit as ApiCommit } from "../../../types/commit";

// Internal representation for rendering
interface TreeCommit {
    id: string;
    shortId: string;
    message: string;
    author: string;
    timestamp: Date;
    branch: string;
    type: "commit" | "merge" | "split";
    sourceBranch?: string;
    targetBranch?: string;
}

interface BranchInfo {
    name: string;
    color: string;
    lane: number;
    active: boolean;
}

// Branch colors
const BRANCH_COLORS: Record<string, string> = {
    main: "#22c55e",
    develop: "#8b5cf6",
    hotfix: "#ef4444",
};

const getBranchColor = (branchName: string): string => {
    if (BRANCH_COLORS[branchName]) {
        return BRANCH_COLORS[branchName];
    }
    // Generate consistent color from branch name
    let hash = 0;
    for (let i = 0; i < branchName.length; i++) {
        hash = branchName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
};

// Convert API commit to tree commit
const toTreeCommit = (commit: ApiCommit): TreeCommit => {
    let type: "commit" | "merge" | "split" = "commit";
    if (commit.type === "MERGE") type = "merge";
    else if (commit.type === "SPLIT") type = "split";

    return {
        id: commit.id,
        shortId: commit.id.substring(0, 7),
        message: commit.message || `${commit.type} operation`,
        author: commit.author || "Unknown",
        timestamp: new Date(commit.createdAt),
        branch: commit.branch,
        type,
        sourceBranch: commit.sourceBranch || undefined,
        targetBranch: commit.targetBranch || undefined,
    };
};

interface VersionTreeProps {
    commits?: ApiCommit[];
    onCommitClick?: (commit: ApiCommit) => void;
    isLoading?: boolean;
}

const VersionTree = ({ commits = [], onCommitClick, isLoading }: VersionTreeProps) => {
    // Convert API commits to tree commits
    const treeCommits = useMemo(() => {
        return commits.map(toTreeCommit);
    }, [commits]);

    // Sort commits by timestamp descending (newest first)
    const sortedCommits = useMemo(() => {
        return [...treeCommits].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [treeCommits]);

    // Calculate branch lanes and positions
    const { branchInfoMap, laneCount } = useMemo(() => {
        const branches = new Map<string, BranchInfo>();
        let currentLane = 0;
        const activeLanes: Set<number> = new Set();

        // Process in chronological order (oldest first) for lane calculation
        const chronological = [...treeCommits].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        chronological.forEach((commit) => {
            if (!branches.has(commit.branch)) {
                // Find first available lane
                let lane = 0;
                while (activeLanes.has(lane)) {
                    lane++;
                }

                // Main branch always gets lane 0
                if (commit.branch === "main") {
                    lane = 0;
                }

                branches.set(commit.branch, {
                    name: commit.branch,
                    color: getBranchColor(commit.branch),
                    lane,
                    active: true,
                });
                activeLanes.add(lane);
                currentLane = Math.max(currentLane, lane + 1);
            }

            // Check for merges that close branches
            if (commit.type === "merge" && commit.sourceBranch) {
                const mergedBranch = branches.get(commit.sourceBranch);
                if (mergedBranch) {
                    mergedBranch.active = false;
                    activeLanes.delete(mergedBranch.lane);
                }
            }
        });

        return {
            branchInfoMap: branches,
            laneCount: Math.max(currentLane, 1),
        };
    }, [treeCommits]);

    const handleCommitClick = (commit: TreeCommit) => {
        if (onCommitClick) {
            const originalCommit = commits.find(c => c.id === commit.id);
            if (originalCommit) {
                onCommitClick(originalCommit);
            }
        }
    };

    const formatTimestamp = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Layout constants
    const LANE_WIDTH = 24;
    const ROW_HEIGHT = 80;
    const NODE_RADIUS = 8;
    const GRAPH_WIDTH = (laneCount + 1) * LANE_WIDTH + 20;

    // Get X position for a lane
    const getLaneX = (lane: number) => 20 + lane * LANE_WIDTH;

    // Render SVG paths for branch lines
    const renderBranchLines = () => {
        const lines: ReactElement[] = [];

        sortedCommits.forEach((commit, index) => {
            const branchInfo = branchInfoMap.get(commit.branch);
            if (!branchInfo) return;

            const x = getLaneX(branchInfo.lane);
            const y = index * ROW_HEIGHT + ROW_HEIGHT / 2;

            // Vertical line to next commit on same branch
            if (index < sortedCommits.length - 1) {
                const nextOnBranch = sortedCommits.findIndex(
                    (c, i) => i > index && c.branch === commit.branch
                );
                if (nextOnBranch !== -1) {
                    const nextY = nextOnBranch * ROW_HEIGHT + ROW_HEIGHT / 2;
                    lines.push(
                        <line
                            key={`line-${commit.id}-vertical`}
                            x1={x}
                            y1={y + NODE_RADIUS}
                            x2={x}
                            y2={nextY - NODE_RADIUS}
                            stroke={branchInfo.color}
                            strokeWidth={2}
                        />
                    );
                }
            }

            // Branch creation line (SPLIT type)
            if (commit.type === "split" && commit.sourceBranch) {
                const parentBranch = branchInfoMap.get(commit.sourceBranch);
                if (parentBranch) {
                    // Find the closest commit on parent branch before this split
                    const parentCommit = sortedCommits.find(
                        (c, i) => i > index && c.branch === commit.sourceBranch
                    );
                    if (parentCommit) {
                        const parentIndex = sortedCommits.indexOf(parentCommit);
                        const parentX = getLaneX(parentBranch.lane);
                        const parentY = parentIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

                        lines.push(
                            <path
                                key={`branch-${commit.id}`}
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

            // Merge line
            if (commit.type === "merge" && commit.sourceBranch) {
                const mergedBranch = branchInfoMap.get(commit.sourceBranch);
                if (mergedBranch) {
                    const mergedX = getLaneX(mergedBranch.lane);
                    // Find the most recent commit on merged branch
                    const lastMergedCommit = sortedCommits
                        .slice(index + 1)
                        .find((c) => c.branch === commit.sourceBranch);

                    if (lastMergedCommit) {
                        const lastMergedIndex = sortedCommits.indexOf(lastMergedCommit);
                        const lastMergedY = lastMergedIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

                        lines.push(
                            <path
                                key={`merge-${commit.id}`}
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
        });

        return lines;
    };

    // Render commit nodes
    const renderCommitNodes = () => {
        return sortedCommits.map((commit, index) => {
            const branchInfo = branchInfoMap.get(commit.branch);
            if (!branchInfo) return null;

            const x = getLaneX(branchInfo.lane);
            const y = index * ROW_HEIGHT + ROW_HEIGHT / 2;

            const getNodeContent = () => {
                if (commit.type === "merge") {
                    return (
                        <g>
                            <circle
                                cx={x}
                                cy={y}
                                r={NODE_RADIUS + 2}
                                fill="var(--gray-1)"
                                stroke={branchInfo.color}
                                strokeWidth={3}
                            />
                            <GitMerge
                                x={x - 5}
                                y={y - 5}
                                size={10}
                                color={branchInfo.color}
                            />
                        </g>
                    );
                } else if (commit.type === "split") {
                    return (
                        <g>
                            <circle
                                cx={x}
                                cy={y}
                                r={NODE_RADIUS + 2}
                                fill="var(--gray-1)"
                                stroke={branchInfo.color}
                                strokeWidth={3}
                            />
                            <GitBranch
                                x={x - 5}
                                y={y - 5}
                                size={10}
                                color={branchInfo.color}
                            />
                        </g>
                    );
                }
                // Regular commit (user label)
                return (
                    <g>
                        <circle
                            cx={x}
                            cy={y}
                            r={NODE_RADIUS + 1}
                            fill="var(--gray-1)"
                            stroke={branchInfo.color}
                            strokeWidth={3}
                        />
                        <Tag
                            x={x - 4}
                            y={y - 4}
                            size={8}
                            color={branchInfo.color}
                        />
                    </g>
                );
            };

            return (
                <g key={commit.id} style={{ cursor: "pointer" }} onClick={() => handleCommitClick(commit)}>
                    {getNodeContent()}
                </g>
            );
        });
    };

    if (isLoading) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <Text color="gray">Loading commits...</Text>
            </div>
        );
    }

    if (sortedCommits.length === 0) {
        return (
            <div style={{
                padding: "40px",
                textAlign: "center",
                backgroundColor: "var(--gray-2)",
                borderRadius: "8px",
                border: "2px dashed var(--gray-6)"
            }}>
                <Tag size={48} color="var(--gray-8)" style={{ marginBottom: "16px" }} />
                <Text size="3" weight="medium" style={{ display: "block", marginBottom: "8px" }}>
                    No Commits Yet
                </Text>
                <Text size="2" color="gray">
                    Create a commit to label and track versions of your document.
                </Text>
            </div>
        );
    }

    return (
        <div>
            {/* Graph and Commit List */}
            <div style={{ display: "flex", position: "relative" }}>
                {/* SVG Graph */}
                <svg
                    width={GRAPH_WIDTH}
                    height={sortedCommits.length * ROW_HEIGHT}
                    style={{ flexShrink: 0 }}
                >
                    {renderBranchLines()}
                    {renderCommitNodes()}
                </svg>

                {/* Commit Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {sortedCommits.map((commit) => {
                        const branchInfo = branchInfoMap.get(commit.branch);

                        return (
                            <div
                                key={commit.id}
                                onClick={() => handleCommitClick(commit)}
                                style={{
                                    height: ROW_HEIGHT,
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "8px 16px",
                                    marginLeft: "8px",
                                    cursor: "pointer",
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                        <Text
                                            size="2"
                                            weight="medium"
                                            style={{
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {commit.message}
                                        </Text>
                                        {commit.type === "merge" && (
                                            <Badge size="1" color="purple">merge</Badge>
                                        )}
                                        {commit.type === "split" && (
                                            <Badge size="1" color="blue">branch</Badge>
                                        )}
                                        {commit.type === "commit" && (
                                            <Badge size="1" color="green">version</Badge>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <Text
                                            size="1"
                                            style={{
                                                fontFamily: "monospace",
                                                color: branchInfo?.color,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {commit.shortId}
                                        </Text>
                                        <Text size="1" color="gray">
                                            {commit.author}
                                        </Text>
                                        <Text size="1" color="gray">
                                            {formatTimestamp(commit.timestamp)}
                                        </Text>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <Badge
                                        size="1"
                                        style={{
                                            backgroundColor: branchInfo?.color,
                                            color: "white",
                                        }}
                                    >
                                        {commit.branch}
                                    </Badge>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VersionTree;
