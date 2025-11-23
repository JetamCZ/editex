import { useState } from "react";
import type { Route } from "./+types/editor";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Box, Flex, ScrollArea, Text, Card, Separator, Heading } from "@radix-ui/themes";
import { FileTreeNode, type FileNode } from "../components/FileTreeNode";
import Editor from "@monaco-editor/react";
import { getApiClient } from "../lib/axios.server";
import type { Project } from "../../types/project";

// Mock folder structure
const mockFileTree: FileNode[] = [
  {
    name: "project",
    type: "folder",
    path: "/project",
    children: [
      { name: "main.tex", type: "file", path: "/project/main.tex" },
      { name: "chapter1.tex", type: "file", path: "/project/chapter1.tex" },
      {
        name: "images",
        type: "folder",
        path: "/project/images",
        children: [
          { name: "diagram.png", type: "file", path: "/project/images/diagram.png" },
          { name: "photo.jpg", type: "file", path: "/project/images/photo.jpg" },
        ],
      },
      {
        name: "styles",
        type: "folder",
        path: "/project/styles",
        children: [
          { name: "custom.sty", type: "file", path: "/project/styles/custom.sty" },
        ],
      },
    ],
  },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const api = await getApiClient(request);
  const { id } = params;

  try {
    const response = await api.get<Project>(`/projects/${id}`);
    return { project: response.data };
  } catch (error) {
    console.error("Error loading project:", error);
    throw new Response("Project not found", { status: 404 });
  }
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: data?.project?.name || "Editor" },
    { name: "description", content: "LaTeX Editor" },
  ];
}

export default function EditorPage() {
  const { project } = useLoaderData<typeof loader>();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");

  const handleFileClick = (path: string) => {
    setSelectedFile(path);
    // Mock file content based on path
    setFileContent(`% Content of ${path}\n\n\\documentclass{article}\n\\begin{document}\n\nThis is a placeholder for the actual file content.\n\n\\end{document}`);
  };

  return (
    <Flex style={{ height: "100vh" }}>
      {/* Left Sidebar - File Tree */}
      <Box
        style={{
          width: "250px",
          borderRight: "1px solid var(--gray-6)",
          backgroundColor: "var(--gray-2)",
        }}
      >
        <Box p="3">
          <Heading size="4" mb="1">
            {project.name}
          </Heading>
          <Text size="2" color="gray">
            Project Files
          </Text>
        </Box>
        <Separator size="4" />
        <ScrollArea style={{ height: "calc(100vh - 60px)" }}>
          <Box p="2">
            {mockFileTree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                onFileClick={handleFileClick}
                selectedPath={selectedFile}
              />
            ))}
          </Box>
        </ScrollArea>
      </Box>

      {/* Right Panel - Editor and Preview */}
      <Flex direction="row" style={{ flex: 1 }}>
        {/* Editor */}
        <Box style={{ flex: 1, borderRight: "1px solid var(--gray-6)", display: "flex", flexDirection: "column" }}>
          <Box p="3" style={{ borderBottom: "1px solid var(--gray-6)" }}>
            <Text size="2" color="gray">
              {selectedFile || "No file selected"}
            </Text>
          </Box>
          <Box style={{ flex: 1 }}>
            {selectedFile ? (
              <Editor
                height="100%"
                defaultLanguage="latex"
                language="latex"
                value={fileContent}
                theme="light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  readOnly: false,
                  wordWrap: "on",
                }}
              />
            ) : (
              <Box p="3">
                <Text color="gray">Select a file from the tree to view its contents</Text>
              </Box>
            )}
          </Box>
        </Box>

        {/* Preview */}
        <Box style={{ flex: 1, backgroundColor: "var(--gray-1)" }}>
          <Box p="3" style={{ borderBottom: "1px solid var(--gray-6)" }}>
            <Text size="2" weight="bold">
              Preview
            </Text>
          </Box>
          <Box p="3">
            {selectedFile ? (
              <Card>
                <Text color="gray" align="center" style={{ padding: "40px" }}>
                  LaTeX preview will appear here
                </Text>
              </Card>
            ) : (
              <Text color="gray">Preview will appear when a file is opened</Text>
            )}
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}
