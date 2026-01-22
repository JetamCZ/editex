import { useOutletContext, useNavigate } from "react-router";
import type { Project } from "../../../types/project";
import type { ProjectMember } from "../../../types/member";
import type { Branch } from "../../../types/branch";
import { Box, Text, Button, Badge, Card, Heading, Separator } from "@radix-ui/themes";
import { useBranches } from "~/hooks/useBranches";
import { useCommits, usePendingChanges } from "~/hooks/useCommits";
import { useState, useMemo } from "react";
import CreateBranchDialog from "~/components/CreateBranchDialog";
import CreateCommitDialog from "~/components/CreateCommitDialog";
import MergeBranchDialog from "~/components/MergeBranchDialog";
import { GitBranch, Plus, GitMerge, Tag } from "lucide-react";
import VersionTree from "~/components/VersionTree";

interface OutletContextType {
    project: Project;
    members: ProjectMember[];
}

interface BranchNode {
    branch: Branch;
    children: BranchNode[];
    depth: number;
    index: number;
}

const HistoryPage = () => {
    const { project } = useOutletContext<OutletContextType>();
    const navigate = useNavigate();
    const [createBranchDialogOpen, setCreateBranchDialogOpen] = useState(false);
    const [selectedBranchForNew, setSelectedBranchForNew] = useState<string>(project.branch);
    const [mergeBranchDialogOpen, setMergeBranchDialogOpen] = useState(false);
    const [selectedBranchForMerge, setSelectedBranchForMerge] = useState<Branch | null>(null);
    const [createCommitDialogOpen, setCreateCommitDialogOpen] = useState(false);

    const { data: branches = [], isLoading: branchesLoading } = useBranches({
        baseProject: project.baseProject
    });

    const { data: commits = [], isLoading: commitsLoading, refetch: refetchCommits } = useCommits({
        baseProject: project.baseProject
    });

    const { data: pendingChanges = [], refetch: refetchPendingChanges } = usePendingChanges({
        baseProject: project.baseProject
    });

    // Build tree structure from branches
    const branchTree = useMemo(() => {
        if (branches.length === 0) return null;

        // Find main branch (no source branch)
        const mainBranch = branches.find(b => !b.sourceBranch);
        if (!mainBranch) return null;

        // Build tree recursively
        const buildTree = (parentBranch: string, depth: number): BranchNode[] => {
            const children = branches
                .filter(b => b.sourceBranch === parentBranch)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            return children.map((branch, index) => ({
                branch,
                children: buildTree(branch.branch, depth + 1),
                depth,
                index
            }));
        };

        return {
            branch: mainBranch,
            children: buildTree(mainBranch.branch, 1),
            depth: 0,
            index: 0
        } as BranchNode;
    }, [branches]);

    const handleBranchSwitch = (branchName: string) => {
        if (branchName !== project.branch) {
            navigate(`/project/${project.baseProject}/${branchName}/history`);
        }
    };

    const handleCreateBranchFrom = (branchName: string) => {
        setSelectedBranchForNew(branchName);
        setCreateBranchDialogOpen(true);
    };

    const handleBranchCreated = (branchName: string) => {
        refetchCommits();
        refetchPendingChanges();
        navigate(`/project/${project.baseProject}/${branchName}/history`);
    };

    const handleMergeBranch = (branch: Branch) => {
        setSelectedBranchForMerge(branch);
        setMergeBranchDialogOpen(true);
    };

    const handleMergeComplete = (targetBranch: string) => {
        refetchCommits();
        refetchPendingChanges();
        navigate(`/project/${project.baseProject}/${targetBranch}/history`);
    };

    const handleCommitCreated = () => {
        refetchCommits();
        refetchPendingChanges();
    };

    // Render branch node in the tree
    const renderBranchNode = (node: BranchNode, isLast: boolean = false, parentLines: boolean[] = []) => {
        const isCurrentBranch = node.branch.branch === project.branch;
        const isMainBranch = !node.branch.sourceBranch;

        return (
            <div key={node.branch.id}>
                <div style={{ display: "flex", alignItems: "stretch" }}>
                    {/* Tree lines for hierarchy */}
                    <div style={{ display: "flex", alignItems: "center", paddingRight: "8px" }}>
                        {parentLines.map((hasLine, idx) => (
                            <div
                                key={idx}
                                style={{
                                    width: "24px",
                                    height: "100%",
                                    position: "relative"
                                }}
                            >
                                {hasLine && (
                                    <div style={{
                                        position: "absolute",
                                        left: "11px",
                                        top: 0,
                                        bottom: 0,
                                        width: "2px",
                                        backgroundColor: "var(--gray-6)"
                                    }} />
                                )}
                            </div>
                        ))}
                        {node.depth > 0 && (
                            <div style={{
                                width: "24px",
                                height: "100%",
                                position: "relative",
                                display: "flex",
                                alignItems: "center"
                            }}>
                                {/* Vertical line */}
                                <div style={{
                                    position: "absolute",
                                    left: "11px",
                                    top: 0,
                                    height: isLast ? "50%" : "100%",
                                    width: "2px",
                                    backgroundColor: "var(--gray-6)"
                                }} />
                                {/* Horizontal line */}
                                <div style={{
                                    position: "absolute",
                                    left: "11px",
                                    top: "50%",
                                    width: "13px",
                                    height: "2px",
                                    backgroundColor: "var(--gray-6)"
                                }} />
                            </div>
                        )}
                    </div>

                    {/* Branch node */}
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            marginBottom: "4px",
                            borderRadius: "8px",
                            backgroundColor: isCurrentBranch ? "var(--blue-3)" : "var(--gray-2)",
                            border: isCurrentBranch ? "2px solid var(--blue-6)" : "1px solid var(--gray-4)",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                        onClick={() => handleBranchSwitch(node.branch.branch)}
                    >
                        {/* Branch icon */}
                        <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: isMainBranch ? "var(--green-9)" : "var(--blue-9)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                        }}>
                            <GitBranch size={16} color="white" />
                        </div>

                        {/* Branch info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Text size="3" weight="bold">{node.branch.branch}</Text>
                                {isCurrentBranch && (
                                    <Badge size="1" color="blue">current</Badge>
                                )}
                                {isMainBranch && (
                                    <Badge size="1" color="green">main</Badge>
                                )}
                            </div>
                            <Text size="1" color="gray">
                                Created {new Date(node.branch.createdAt).toLocaleDateString()} at {new Date(node.branch.createdAt).toLocaleTimeString()}
                                {node.branch.sourceBranch && (
                                    <> from <span style={{ fontWeight: 500 }}>{node.branch.sourceBranch}</span></>
                                )}
                            </Text>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "8px" }}>
                            {/* Merge button - only for non-main branches (branches that have a source branch) */}
                            {node.branch.sourceBranch && (
                                <Button
                                    size="1"
                                    variant="soft"
                                    color="orange"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMergeBranch(node.branch);
                                    }}
                                >
                                    <GitMerge size={14} /> Merge
                                </Button>
                            )}
                            <Button
                                size="1"
                                variant="soft"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreateBranchFrom(node.branch.branch);
                                }}
                            >
                                <Plus size={14} /> Branch
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Render children */}
                {node.children.length > 0 && (
                    <div>
                        {node.children.map((child, idx) =>
                            renderBranchNode(
                                child,
                                idx === node.children.length - 1,
                                [...parentLines, !isLast && node.depth > 0]
                            )
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Box style={{ flex: 1, overflow: "auto", backgroundColor: "var(--gray-1)" }}>
            <Box p="6" style={{ maxWidth: "1200px", margin: "0 auto" }}>
                {/* Header */}
                <div style={{ marginBottom: "32px" }}>
                    <Heading size="6" mb="2">Version History</Heading>
                    <Text color="gray" size="2">
                        View and manage branches and versions for {project.name}
                    </Text>
                </div>

                {/* Branch Tree Section */}
                <Card style={{ marginBottom: "24px" }}>
                    <div style={{ padding: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <GitBranch size={20} />
                                <Text size="4" weight="bold">Branch Tree</Text>
                                <Badge size="1" color="gray">{branches.length} branches</Badge>
                            </div>
                            <Button
                                size="2"
                                onClick={() => {
                                    setSelectedBranchForNew(project.branch);
                                    setCreateBranchDialogOpen(true);
                                }}
                            >
                                <Plus size={16} /> New Branch
                            </Button>
                        </div>

                        {branchesLoading ? (
                            <Text color="gray">Loading branches...</Text>
                        ) : branchTree ? (
                            <div style={{ paddingLeft: "8px" }}>
                                {renderBranchNode(branchTree)}
                            </div>
                        ) : (
                            <Text color="gray">No branches found</Text>
                        )}
                    </div>
                </Card>

                {/* Version History Section */}
                <Card>
                    <div style={{ padding: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Tag size={20} />
                                <Text size="4" weight="bold">Version History</Text>
                                <Badge size="1" color="gray">{commits.length} commits</Badge>
                            </div>
                            <Button
                                size="2"
                                color="green"
                                onClick={() => setCreateCommitDialogOpen(true)}
                            >
                                <Tag size={16} /> Create Version
                            </Button>
                        </div>

                        <Separator size="4" style={{ marginBottom: "20px" }} />

                        <VersionTree
                            commits={commits}
                            pendingChanges={pendingChanges}
                            isLoading={commitsLoading}
                        />
                    </div>
                </Card>
            </Box>

            {/* Create Branch Dialog */}
            <CreateBranchDialog
                open={createBranchDialogOpen}
                onOpenChange={setCreateBranchDialogOpen}
                baseProject={project.baseProject}
                currentBranch={selectedBranchForNew}
                onBranchCreated={handleBranchCreated}
            />

            {/* Create Commit Dialog */}
            <CreateCommitDialog
                open={createCommitDialogOpen}
                onOpenChange={setCreateCommitDialogOpen}
                baseProject={project.baseProject}
                currentBranch={project.branch}
                onCommitCreated={handleCommitCreated}
            />

            {/* Merge Branch Dialog */}
            {selectedBranchForMerge && (
                <MergeBranchDialog
                    open={mergeBranchDialogOpen}
                    onOpenChange={setMergeBranchDialogOpen}
                    baseProject={project.baseProject}
                    sourceBranch={selectedBranchForMerge}
                    branches={branches}
                    onMergeComplete={handleMergeComplete}
                />
            )}
        </Box>
    );
};

export default HistoryPage;
