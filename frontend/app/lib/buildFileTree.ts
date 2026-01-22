// Utility function to build file tree from uploaded files
import type {ProjectFile} from "../../types/file";
import type {FileNode} from "~/components/FileTreeNode";

function buildFileTree(files: ProjectFile[]): FileNode[] {
    const root: FileNode = {
        name: "root",
        type: "folder",
        path: "/",
        children: []
    };

    const folderMap = new Map<string, FileNode>();
    folderMap.set("/", root);

    files.forEach(file => {
        const folderPath = file.projectFolder;
        const pathParts = folderPath.split('/').filter(Boolean);

        let currentPath = "";
        let parentNode = root;

        pathParts.forEach(part => {
            currentPath += "/" + part;

            if (!folderMap.has(currentPath)) {
                const folderNode: FileNode = {
                    name: part,
                    type: "folder",
                    path: currentPath,
                    children: []
                };

                if (!parentNode.children) {
                    parentNode.children = [];
                }
                parentNode.children.push(folderNode);
                folderMap.set(currentPath, folderNode);
            }

            parentNode = folderMap.get(currentPath)!;
        });

        const fileNode: FileNode = {
            name: file.originalFileName,
            type: "file",
            path: folderPath + "/" + file.originalFileName,
            fileId: file.id,
            s3Url: file.s3Url,
            folder: file.projectFolder,
        };

        if (!parentNode.children) {
            parentNode.children = [];
        }
        parentNode.children.push(fileNode);
    });

    return root.children || [];
}

export default buildFileTree;
