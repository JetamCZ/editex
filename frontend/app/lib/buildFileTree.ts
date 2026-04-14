import type {ProjectFile} from "../../types/file";
import type {FileNode} from "~/components/FileTreeNode";
import type {ProjectFolder} from "../../types/permission";

function buildFileTree(files: ProjectFile[], folders: ProjectFolder[] = []): FileNode[] {
    const folderByPath = new Map<string, ProjectFolder>();
    folders.forEach(f => folderByPath.set(f.path, f));

    const root: FileNode = {
        name: "root",
        type: "folder",
        path: "/",
        children: [],
        folderId: folderByPath.get("/")?.id,
        effectiveRole: folderByPath.get("/")?.effectiveRole ?? null,
        hasExplicitGrants: folderByPath.get("/")?.hasExplicitGrants ?? false,
    };

    const nodeByPath = new Map<string, FileNode>();
    nodeByPath.set("/", root);

    // Pre-create nodes for every backend-known folder so empty folders are visible too.
    const sortedFolders = [...folders].sort((a, b) => a.path.length - b.path.length);
    sortedFolders.forEach(folder => {
        if (folder.path === "/") return;
        const parentPath = folder.path.substring(0, folder.path.lastIndexOf("/")) || "/";
        const parent = nodeByPath.get(parentPath) ?? root;
        const node: FileNode = {
            name: folder.name,
            type: "folder",
            path: folder.path,
            children: [],
            folderId: folder.id,
            effectiveRole: folder.effectiveRole,
            hasExplicitGrants: folder.hasExplicitGrants,
        };
        if (!parent.children) parent.children = [];
        parent.children.push(node);
        nodeByPath.set(folder.path, node);
    });

    files.forEach(file => {
        const folderPath = file.projectFolder || "/";
        const pathParts = folderPath.split("/").filter(Boolean);

        let currentPath = "";
        let parentNode = root;

        pathParts.forEach(part => {
            currentPath += "/" + part;

            if (!nodeByPath.has(currentPath)) {
                // Folder unknown to the backend response — synthesize one.
                const folderNode: FileNode = {
                    name: part,
                    type: "folder",
                    path: currentPath,
                    children: [],
                    folderId: folderByPath.get(currentPath)?.id,
                    effectiveRole: folderByPath.get(currentPath)?.effectiveRole ?? null,
                    hasExplicitGrants: folderByPath.get(currentPath)?.hasExplicitGrants ?? false,
                };
                if (!parentNode.children) parentNode.children = [];
                parentNode.children.push(folderNode);
                nodeByPath.set(currentPath, folderNode);
            }
            parentNode = nodeByPath.get(currentPath)!;
        });

        const fileNode: FileNode = {
            name: file.originalFileName,
            type: "file",
            path: folderPath + "/" + file.originalFileName,
            fileId: file.id,
            s3Url: file.s3Url,
            folder: file.projectFolder,
            activeBranchName: file.activeBranchName,
            effectiveRole: parentNode.effectiveRole ?? null,
        };

        if (!parentNode.children) parentNode.children = [];
        parentNode.children.push(fileNode);
    });

    return root.children || [];
}

export default buildFileTree;
