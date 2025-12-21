import { useState, useEffect, useRef, useCallback } from "react";
import { Editor as MonacoEditor } from "@monaco-editor/react";
import { Box, Flex } from "@radix-ui/themes";
import { v4 as uuidv4 } from "uuid";
import { websocketService } from "~/lib/websocket.service";
import type { ProjectFile } from "~/types/file";
import getLanguageFromFilename from "~/lib/getLanguageFromFilename";
import computeDeltas from "~/components/CollaborativeEditor/libs/computeDeltas";
import useTextFileContent from "~/components/CollaborativeEditor/hooks/useTextFileContent";
import EditorHeader from "~/components/CollaborativeEditor/EditorHeader";

interface Props {
  selectedFile: ProjectFile;
  bearerToken: string;
}

const CollaborativeEditor = ({
  selectedFile,
  bearerToken,
}: Props) => {
  const [sessionId] = useState(uuidv4());
  const {activeUsers, isConnected, content, lastChangeId} = useTextFileContent(selectedFile.id)

  const [editorContent, setEditorContent] = useState("")

  const lastChangeIdRef = useRef<string|null>("");
  const previousContentRef = useRef<string>("");

  useEffect(() => {
    setEditorContent(content);
    previousContentRef.current = content;
    lastChangeIdRef.current = lastChangeId;
  }, [content])


  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isApplyingRemoteChangeRef = useRef(false);


  // Handle editor change
  const handleEditorChange = (value: string | undefined) => {
    if (!value || isApplyingRemoteChangeRef.current) {
      return;
    }

    setEditorContent(value);

    // Debounce sending changes to server
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const deltas = computeDeltas(previousContentRef.current, value);

      if (deltas.length > 0 && websocketService.isConnected()) {
        const editMessage = {
          fileId: selectedFile.id,
          sessionId,
          lastChangeId: lastChangeIdRef.current,
          deltas,
          cursorPosition: editorRef.current?.getPosition()?.column || 0,
          currentLine: editorRef.current?.getPosition()?.lineNumber || 0,
        };

        websocketService.sendEdit(selectedFile.id, editMessage);
        previousContentRef.current = value;
      }
    }, 2000);
  };

  // Handle cursor movement
  const handleCursorPositionChange = () => {
    if (!editorRef.current || !websocketService.isConnected()) {
      return;
    }

    const position = editorRef.current.getPosition();
    if (position) {
      websocketService.updateCursor(
        selectedFile.id,
        position.column,
        position.lineNumber
      );
    }
  };

  // Monaco editor did mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Listen to cursor position changes
    editor.onDidChangeCursorPosition(() => {
      handleCursorPositionChange();
    });
  };

  const fileLanguage = getLanguageFromFilename(selectedFile.originalFileName);

  return (
    <Flex direction="column" height="100%">
      <EditorHeader
        isConnected={isConnected}
        fileName={selectedFile.originalFileName}
        activeUsers={activeUsers}
      />

      {/* Monaco Editor */}
      <Box style={{ flex: 1 }}>
        <MonacoEditor
          height="100%"
          defaultLanguage={fileLanguage}
          language={fileLanguage}
          value={editorContent}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            readOnly: false,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </Box>
    </Flex>
  );
};

export default CollaborativeEditor;
