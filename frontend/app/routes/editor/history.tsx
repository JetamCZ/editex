import { useOutletContext } from "react-router";
import type { Project } from "../../../types/project";
import type { ProjectMember } from "../../../types/member";
import { Box, Text, Card, Heading, Badge, Separator, Avatar } from "@radix-ui/themes";
import { useRecentChanges } from "~/hooks/useRecentChanges";
import { Clock, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import getInitials from "~/lib/getInitials";

export function meta({ matches }: { matches: Array<{ data?: { project?: Project } }> }) {
    const parentData = matches.find(m => m.data?.project)?.data;
    const projectName = parentData?.project?.name || "Project";
    return [
        { title: `History - ${projectName} - Editex` },
    ];
}

interface OutletContextType {
    project: Project;
    members: ProjectMember[];
}

const HistoryPage = () => {
    const { project } = useOutletContext<OutletContextType>();

    const { data: changes = [], isLoading } = useRecentChanges({
        baseProject: project.baseProject,
        branch: project.branch,
        limit: 10
    });

    const formatTimestamp = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDuration = (firstDate: string, lastDate: string) => {
        const first = new Date(firstDate);
        const last = new Date(lastDate);
        const diffMs = last.getTime() - first.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor(diffMs / 1000);

        if (diffSecs < 60) return `${diffSecs}s`;
        return `${diffMins}m`;
    };

    return (
        <Box style={{ flex: 1, overflow: "auto", backgroundColor: "var(--gray-1)" }}>
            <Box p="6" style={{ maxWidth: "900px", margin: "0 auto" }}>
                {/* Header */}
                <div style={{ marginBottom: "32px" }}>
                    <Heading size="6" mb="2">History</Heading>
                    <Text color="gray" size="2">
                        Recent changes in <Badge size="1">{project.branch}</Badge> branch
                    </Text>
                </div>

                {/* Changes List */}
                <Card>
                    <div style={{ padding: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                            <Clock size={20} />
                            <Text size="4" weight="bold">Recent Activity</Text>
                            <Badge size="1" color="gray">{changes.length} sessions</Badge>
                        </div>

                        <Separator size="4" style={{ marginBottom: "16px" }} />

                        {isLoading ? (
                            <div style={{ padding: "40px", textAlign: "center" }}>
                                <Text color="gray">Loading changes...</Text>
                            </div>
                        ) : changes.length === 0 ? (
                            <div style={{
                                padding: "40px",
                                textAlign: "center",
                                backgroundColor: "var(--gray-2)",
                                borderRadius: "8px",
                                border: "2px dashed var(--gray-6)"
                            }}>
                                <Clock size={48} color="var(--gray-8)" style={{ marginBottom: "16px" }} />
                                <Text size="3" weight="medium" style={{ display: "block", marginBottom: "8px" }}>
                                    No Changes Yet
                                </Text>
                                <Text size="2" color="gray">
                                    Start editing files to see your change history here.
                                </Text>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                {changes.map((change, index) => (
                                    <div
                                        key={`${change.sessionId}-${change.fileId}-${change.lastChangeAt}`}
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: "12px",
                                            padding: "12px",
                                            borderRadius: "8px",
                                            backgroundColor: index % 2 === 0 ? "var(--gray-2)" : "transparent",
                                        }}
                                    >
                                        {/* Avatar */}
                                        <Avatar
                                            size="2"
                                            fallback={getInitials(change.userName || "U")}
                                            radius="full"
                                            style={{ flexShrink: 0, marginTop: "2px" }}
                                        />

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                                                <Text size="2" weight="medium">
                                                    {change.userName || "Unknown User"}
                                                </Text>
                                                <Text size="2" color="gray">
                                                    edited
                                                </Text>
                                                <Badge size="1" color="blue">
                                                    {change.changeCount} {change.changeCount === 1 ? 'change' : 'changes'}
                                                </Badge>
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                                <FileText size={12} color="var(--gray-9)" />
                                                <Text
                                                    size="2"
                                                    style={{
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap"
                                                    }}
                                                >
                                                    {change.filePath}
                                                </Text>
                                            </div>

                                            {/* Operation stats */}
                                            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                                {change.linesModified > 0 && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                        <Pencil size={12} color="var(--blue-9)" />
                                                        <Text size="1" color="gray">
                                                            {change.linesModified} modified
                                                        </Text>
                                                    </div>
                                                )}
                                                {change.linesInserted > 0 && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                        <Plus size={12} color="var(--green-9)" />
                                                        <Text size="1" color="gray">
                                                            {change.linesInserted} inserted
                                                        </Text>
                                                    </div>
                                                )}
                                                {change.linesDeleted > 0 && (
                                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                        <Trash2 size={12} color="var(--red-9)" />
                                                        <Text size="1" color="gray">
                                                            {change.linesDeleted} deleted
                                                        </Text>
                                                    </div>
                                                )}
                                                {change.firstChangeAt !== change.lastChangeAt && (
                                                    <Text size="1" color="gray">
                                                        over {formatDuration(change.firstChangeAt, change.lastChangeAt)}
                                                    </Text>
                                                )}
                                            </div>
                                        </div>

                                        {/* Timestamp */}
                                        <Text size="1" color="gray" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                                            {formatTimestamp(change.lastChangeAt)}
                                        </Text>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </Box>
        </Box>
    );
};

export default HistoryPage;
