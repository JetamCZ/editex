import { useState } from "react";
import { Box, Text } from "@radix-ui/themes";

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

  return (
    <Box>
      <Box
        onClick={() => {
          if (node.type === "folder") {
            setIsOpen(!isOpen);
          } else if (node.fileId) {
            onFileClick(node.fileId);
          }
        }}
        style={{
          paddingLeft: `${level * 20 + 8}px`,
          paddingTop: "4px",
          paddingBottom: "4px",
          paddingRight: "8px",
          cursor: "pointer",
          backgroundColor: selectedFileId === node.fileId ? "var(--accent-3)" : "transparent",
          borderRadius: "4px",
        }}
      >
        <Text size="2">
          {node.type === "folder" ? (isOpen ? "📁 " : "📂 ") : "📄 "}
          {node.name}
        </Text>
      </Box>
      {node.type === "folder" && isOpen && node.children && (
        <Box>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              onFileClick={onFileClick}
              selectedFileId={selectedFileId}
              level={level + 1}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
