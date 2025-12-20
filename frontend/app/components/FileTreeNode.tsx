import { useState } from "react";
import { ChevronRight, Folder, FolderOpen, FileText } from "lucide-react";
import styles from "./FileTreeNode.module.css";

export type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  fileId?: string;
  children?: FileNode[];
};

export function FileTreeNode({
  node,
  onFileClick,
  selectedFileId,
  level = 0,
}: {
  node: FileNode;
  onFileClick: (fileId: string) => void;
  selectedFileId: string | null;
  level?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedFileId === node.fileId;
  const isFolder = node.type === "folder";

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else if (node.fileId) {
      onFileClick(node.fileId);
    }
  };

  const renderIcon = () => {
    if (isFolder) {
      return isOpen ? (
        <FolderOpen className={styles.treeItemIcon} />
      ) : (
        <Folder className={styles.treeItemIcon} />
      );
    }
    return <FileText className={styles.treeItemIcon} />;
  };

  return (
    <div className={styles.treeNode}>
      <div
        className={`${styles.treeItem} ${isSelected ? styles.selected : ""}`}
        onClick={handleClick}
        style={{ paddingLeft: `${level * 1 + 0.5}rem` }}
      >
        {isFolder && (
          <ChevronRight
            className={`${styles.treeItemChevron} ${isOpen ? styles.open : ""}`}
          />
        )}
        <div className={styles.treeItemContent}>
          {renderIcon()}
          <span className={styles.treeItemLabel}>{node.name}</span>
        </div>
      </div>
      {isFolder && node.children && (
        <div className={`${styles.treeChildren} ${!isOpen ? styles.collapsed : ""}`}>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              onFileClick={onFileClick}
              selectedFileId={selectedFileId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
