import { useState } from "react";
import { ChevronRight, Folder, FolderOpen, FileText, MoreVertical, Trash2, Download, FolderInput } from "lucide-react";
import { DropdownMenu, AlertDialog, Button, Flex, Text } from "@radix-ui/themes";
import styles from "./FileTreeNode.module.css";

export type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  fileId?: string;
  s3Url?: string;
  folder?: string;
  children?: FileNode[];
};

export function FileTreeNode({
  node,
  onFileClick,
  onDeleteFile,
  onMoveFile,
  selectedFileId,
  level = 0,
}: {
  node: FileNode;
  onFileClick: (fileId: string) => void;
  onDeleteFile?: (fileId: string, fileName: string) => void;
  onMoveFile?: (fileId: string, fileName: string, currentFolder: string) => void;
  selectedFileId: string | null;
  level?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isSelected = selectedFileId === node.fileId;
  const isFolder = node.type === "folder";
  const isMainTex = node.name.toLowerCase() === "main.tex";

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else if (node.fileId) {
      onFileClick(node.fileId);
    }
  };

  const handleDownload = () => {
    if (node.s3Url) {
      const link = document.createElement('a');
      link.href = node.s3Url;
      link.download = node.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (node.fileId && onDeleteFile) {
      onDeleteFile(node.fileId, node.name);
    }
    setDeleteDialogOpen(false);
  };

  const handleMoveClick = () => {
    if (node.fileId && onMoveFile && node.folder) {
      onMoveFile(node.fileId, node.name, node.folder);
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
        {!isFolder && node.fileId && (
          <div className={styles.treeItemMenuWrapper} onClick={(e) => e.stopPropagation()}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <button className={styles.treeItemMenu} type="button">
                  <MoreVertical size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content size="1" align="end" sideOffset={4}>
                <DropdownMenu.Item onSelect={handleDownload}>
                  <Download size={14} style={{ marginRight: 8 }} />
                  Download
                </DropdownMenu.Item>
                {!isMainTex && (
                  <>
                    <DropdownMenu.Item onSelect={handleMoveClick}>
                      <FolderInput size={14} style={{ marginRight: 8 }} />
                      Move to...
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item color="red" onSelect={handleDeleteClick}>
                      <Trash2 size={14} style={{ marginRight: 8 }} />
                      Delete
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        )}
      </div>
      {isFolder && node.children && (
        <div className={`${styles.treeChildren} ${!isOpen ? styles.collapsed : ""}`}>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              onFileClick={onFileClick}
              onDeleteFile={onDeleteFile}
              onMoveFile={onMoveFile}
              selectedFileId={selectedFileId}
              level={level + 1}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>Delete File</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Are you sure you want to delete <strong>{node.name}</strong>? This action cannot be undone.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  );
}
