import { useMemo, type ReactElement } from "react";
import { Text, Badge } from "@radix-ui/themes";
import { GitBranch, GitMerge } from "lucide-react";

// Types
interface Commit {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    timestamp: Date;
    branch: string;
    type: "commit" | "merge" | "branch";
    parentHash?: string;
    mergeFrom?: string;
}

interface BranchInfo {
    name: string;
    color: string;
    lane: number;
    startIndex: number;
    endIndex: number;
    active: boolean;
}

// Mock data with full commit details
const MOCK_COMMITS: Commit[] = [
    {
        hash: "a1b2c3d4e5f6789012345678901234567890abcd",
        shortHash: "a1b2c3d",
        message: "Initial project setup",
        author: "John Doe",
        timestamp: new Date("2024-01-15T10:00:00"),
        branch: "main",
        type: "commit",
    },
    {
        hash: "b2c3d4e5f67890123456789012345678901abcde",
        shortHash: "b2c3d4e",
        message: "Add document structure",
        author: "John Doe",
        timestamp: new Date("2024-01-15T14:30:00"),
        branch: "main",
        type: "commit",
        parentHash: "a1b2c3d",
    },
    {
        hash: "c3d4e5f678901234567890123456789012abcdef",
        shortHash: "c3d4e5f",
        message: "Create feature branch for figures",
        author: "Jane Smith",
        timestamp: new Date("2024-01-16T09:00:00"),
        branch: "feature/figures",
        type: "branch",
        parentHash: "b2c3d4e",
    },
    {
        hash: "d4e5f6789012345678901234567890123abcdefg",
        shortHash: "d4e5f67",
        message: "Add introduction section",
        author: "John Doe",
        timestamp: new Date("2024-01-16T11:00:00"),
        branch: "main",
        type: "commit",
        parentHash: "b2c3d4e",
    },
    {
        hash: "f6789012345678901234567890123456abcdefghi",
        shortHash: "f678901",
        message: "Create experimental branch",
        author: "Bob Wilson",
        timestamp: new Date("2024-01-17T09:30:00"),
        branch: "experimental",
        type: "branch",
        parentHash: "d4e5f67",
    },
    {
        hash: "e5f67890123456789012345678901234abcdefgh",
        shortHash: "e5f6789",
        message: "Add figure 1 with caption",
        author: "Jane Smith",
        timestamp: new Date("2024-01-16T14:00:00"),
        branch: "feature/figures",
        type: "commit",
        parentHash: "c3d4e5f",
    },
    {
        hash: "g7890123456789012345678901234567abcdefghij",
        shortHash: "g789012",
        message: "Add figure 2 and references",
        author: "Jane Smith",
        timestamp: new Date("2024-01-17T10:00:00"),
        branch: "feature/figures",
        type: "commit",
        parentHash: "e5f6789",
    },
    {
        hash: "h8901234567890123456789012345678abcdefghijk",
        shortHash: "h890123",
        message: "Try new layout approach",
        author: "Bob Wilson",
        timestamp: new Date("2024-01-17T15:00:00"),
        branch: "experimental",
        type: "commit",
        parentHash: "f678901",
    },
    {
        hash: "i9012345678901234567890123456789abcdefghijkl",
        shortHash: "i901234",
        message: "Merge feature/figures into main",
        author: "John Doe",
        timestamp: new Date("2024-01-18T10:00:00"),
        branch: "main",
        type: "merge",
        parentHash: "d4e5f67",
        mergeFrom: "feature/figures",
    },
    {
        hash: "j0123456789012345678901234567890abcdefghijklm",
        shortHash: "j012345",
        message: "Update bibliography",
        author: "John Doe",
        timestamp: new Date("2024-01-18T14:00:00"),
        branch: "main",
        type: "commit",
        parentHash: "i901234",
    },
    {
        hash: "k1234567890123456789012345678901abcdefghijklmn",
        shortHash: "k123456",
        message: "Final layout tweaks",
        author: "Bob Wilson",
        timestamp: new Date("2024-01-19T09:00:00"),
        branch: "experimental",
        type: "commit",
        parentHash: "h890123",
    },
    {
        hash: "l2345678901234567890123456789012abcdefghijklmno",
        shortHash: "l234567",
        message: "Merge experimental into main",
        author: "John Doe",
        timestamp: new Date("2024-01-20T11:00:00"),
        branch: "main",
        type: "merge",
        parentHash: "j012345",
        mergeFrom: "experimental",
    },
];

// Branch colors
const BRANCH_COLORS: Record<string, string> = {
    main: "#22c55e",
    "feature/figures": "#3b82f6",
    experimental: "#f59e0b",
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

interface VersionTreeProps {
    commits?: Commit[];
    onCommitClick?: (commit: Commit) => void;
}

const VersionTree = ({ commits = MOCK_COMMITS, onCommitClick }: VersionTreeProps) => {
    // Sort commits by timestamp descending (newest first)
    const sortedCommits = useMemo(() => {
        return [...commits].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [commits]);

    // Calculate branch lanes and positions (process in chronological order for correct lane assignment)
    const { branchInfoMap, laneCount } = useMemo(() => {
        const branches = new Map<string, BranchInfo>();
        let currentLane = 0;
        const activeLanes: Set<number> = new Set();

        // Process in chronological order (oldest first) for lane calculation
        const chronological = [...commits].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

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
                    startIndex: 0,
                    endIndex: 0,
                    active: true,
                });
                activeLanes.add(lane);
                currentLane = Math.max(currentLane, lane + 1);
            }

            // Check for merges that close branches
            if (commit.type === "merge" && commit.mergeFrom) {
                const mergedBranch = branches.get(commit.mergeFrom);
                if (mergedBranch) {
                    mergedBranch.active = false;
                    activeLanes.delete(mergedBranch.lane);
                }
            }
        });

        return {
            branchInfoMap: branches,
            laneCount: currentLane,
        };
    }, [commits]);

    const handleCommitClick = (commit: Commit) => {
        onCommitClick?.(commit);
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

            // Vertical line to next commit on same branch (older commit, below in the list)
            if (index < sortedCommits.length - 1) {
                const nextOnBranch = sortedCommits.findIndex(
                    (c, i) => i > index && c.branch === commit.branch
                );
                if (nextOnBranch !== -1) {
                    const nextY = nextOnBranch * ROW_HEIGHT + ROW_HEIGHT / 2;
                    lines.push(
                        <line
                            key={`line-${commit.hash}-vertical`}
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

            // Branch creation line (from branch point below to new branch above)
            if (commit.type === "branch" && commit.parentHash) {
                const parentCommit = sortedCommits.find((c) => c.shortHash === commit.parentHash);
                if (parentCommit) {
                    const parentBranch = branchInfoMap.get(parentCommit.branch);
                    const parentIndex = sortedCommits.indexOf(parentCommit);
                    if (parentBranch) {
                        const parentX = getLaneX(parentBranch.lane);
                        const parentY = parentIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

                        // Parent is below (older), branch point is above (newer)
                        lines.push(
                            <path
                                key={`branch-${commit.hash}`}
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

            // Merge line (from merged branch below to merge commit above)
            if (commit.type === "merge" && commit.mergeFrom) {
                const mergedBranch = branchInfoMap.get(commit.mergeFrom);
                if (mergedBranch) {
                    const mergedX = getLaneX(mergedBranch.lane);
                    // Find the most recent commit on merged branch (first one after merge in sorted list)
                    const lastMergedCommit = sortedCommits
                        .slice(index + 1)
                        .find((c) => c.branch === commit.mergeFrom);

                    if (lastMergedCommit) {
                        const lastMergedIndex = sortedCommits.indexOf(lastMergedCommit);
                        const lastMergedY = lastMergedIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

                        lines.push(
                            <path
                                key={`merge-${commit.hash}`}
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

            // Different node styles for different commit types
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
                } else if (commit.type === "branch") {
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
                return (
                    <circle
                        cx={x}
                        cy={y}
                        r={NODE_RADIUS}
                        fill={branchInfo.color}
                    />
                );
            };

            return (
                <g key={commit.hash} style={{ cursor: "pointer" }} onClick={() => handleCommitClick(commit)}>
                    {getNodeContent()}
                </g>
            );
        });
    };

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
                                key={commit.hash}
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
                                        {commit.type === "branch" && (
                                            <Badge size="1" color="blue">branch</Badge>
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
                                            {commit.shortHash}
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
