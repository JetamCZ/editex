import { useState } from "react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  MoreVertical,
  Trash2,
  Download,
  FolderInput,
  GitBranch,
  Lock,
  FolderPlus,
  Pencil,
} from "lucide-react";
import { DropdownMenu, AlertDialog, Button, Flex, Tooltip } from "@radix-ui/themes";
import styles from "./FileTreeNode.module.css";
import type { FolderRole } from "../../types/permission";
import { roleIncludes, FolderRole as FolderRoleEnum } from "../../types/permission";

export type FileNode = {
  name: string;
  type: "file" | "folder";
  path: string;
  fileId?: string;
  s3Url?: string;
  folder?: string;
  children?: FileNode[];
  activeBranchName?: string | null;
  // Folder-only metadata
  folderId?: number;
  effectiveRole?: FolderRole | null;
  hasExplicitGrants?: boolean;
};

interface Props {
  node: FileNode;
  onFileClick: (fileId: string) => void;
  onDeleteFile?: (fileId: string, fileName: string) => void;
  onMoveFile?: (fileId: string, fileName: string, currentFolder: string) => void;
  onManageFolderAccess?: (folderId: number, path: string) => void;
  onCreateSubfolder?: (parentId: number, parentPath: string) => void;
  onRenameFolder?: (folderId: number, currentName: string) => void;
  onDeleteFolder?: (folderId: number, path: string) => void;
  selectedFileId: string | null;
  level?: number;
}

export function FileTreeNode({
  node,
  onFileClick,
  onDeleteFile,
  onMoveFile,
  onManageFolderAccess,
  onCreateSubfolder,
  onRenameFolder,
  onDeleteFolder,
  selectedFileId,
  level = 0,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isSelected = selectedFileId === node.fileId;
  const isFolder = node.type === "folder";
  const isRootFolder = isFolder && node.path === "/";

  const canEdit = isFolder && roleIncludes(node.effectiveRole, FolderRoleEnum.EDITOR);
  const canManage = isFolder && roleIncludes(node.effectiveRole, FolderRoleEnum.MANAGER);

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else if (node.fileId) {
      onFileClick(node.fileId);
    }
  };

  const handleDownload = () => {
    if (node.s3Url) {
      const link = document.createElement("a");
      link.href = node.s3Url;
      link.download = node.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleConfirmDelete = () => {
    if (isFolder && node.folderId && onDeleteFolder) {
      onDeleteFolder(node.folderId, node.path);
    } else if (node.fileId && onDeleteFile) {
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
          {isFolder && node.hasExplicitGrants && (
            <Tooltip content="This folder has explicit access grants">
              <Lock
                size={10}
                style={{
                  marginLeft: 4,
                  color: "var(--purple-11)",
                  flexShrink: 0,
                }}
              />
            </Tooltip>
          )}
          {!isFolder && node.activeBranchName && node.activeBranchName !== "main" && (
            <span style={{
              fontSize: "9px",
              backgroundColor: "var(--blue-3)",
              color: "var(--blue-11)",
              borderRadius: "6px",
              padding: "0 4px",
              marginLeft: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              flexShrink: 0,
            }}>
              <GitBranch size={8} />
              {node.activeBranchName}
            </span>
          )}
        </div>

        {isFolder && node.folderId && (
          <div className={styles.treeItemMenuWrapper} onClick={(e) => e.stopPropagation()}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <button className={styles.treeItemMenu} type="button">
                  <MoreVertical size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content size="1" align="end" sideOffset={4}>
                {canEdit && (
                  <DropdownMenu.Item
                    onSelect={() => onCreateSubfolder?.(node.folderId!, node.path)}
                  >
                    <FolderPlus size={14} style={{ marginRight: 8 }} />
                    New subfolder
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item onSelect={() => onManageFolderAccess?.(node.folderId!, node.path)}>
                  <Lock size={14} style={{ marginRight: 8 }} />
                  Manage access…
                </DropdownMenu.Item>
                {canManage && !isRootFolder && (
                  <DropdownMenu.Item
                    onSelect={() => onRenameFolder?.(node.folderId!, node.name)}
                  >
                    <Pencil size={14} style={{ marginRight: 8 }} />
                    Rename
                  </DropdownMenu.Item>
                )}
                {canEdit && !isRootFolder && (
                  <>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item color="red" onSelect={() => setDeleteDialogOpen(true)}>
                      <Trash2 size={14} style={{ marginRight: 8 }} />
                      Delete folder
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        )}

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
                <DropdownMenu.Item onSelect={handleMoveClick}>
                  <FolderInput size={14} style={{ marginRight: 8 }} />
                  Move to...
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onSelect={() => setDeleteDialogOpen(true)}>
                  <Trash2 size={14} style={{ marginRight: 8 }} />
                  Delete
                </DropdownMenu.Item>
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
              onManageFolderAccess={onManageFolderAccess}
              onCreateSubfolder={onCreateSubfolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              selectedFileId={selectedFileId}
              level={level + 1}
            />
          ))}
        </div>
      )}

      <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Content maxWidth="400px">
          <AlertDialog.Title>{isFolder ? "Delete folder" : "Delete file"}</AlertDialog.Title>
          <AlertDialog.Description size="2">
            {isFolder ? (
              <>
                Are you sure you want to delete <strong>{node.path}</strong> and
                everything inside it? Files and subfolders will be soft-deleted and
                can be restored later.
              </>
            ) : (
              <>
                Are you sure you want to delete <strong>{node.name}</strong>? This
                action cannot be undone.
              </>
            )}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">Cancel</Button>
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
