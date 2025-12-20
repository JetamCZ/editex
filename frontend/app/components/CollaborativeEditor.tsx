import { useState, useEffect, useRef, useCallback } from "react";
import { Editor as MonacoEditor } from "@monaco-editor/react";
import { Box, Flex, Text, Badge, Avatar } from "@radix-ui/themes";
import { v4 as uuidv4 } from "uuid";
import { websocketService } from "~/lib/websocket.service";
import type {
  DocumentSyncResponse,
  UserPresenceMessage,
  LineDelta,
  DeltaType,
} from "~/types/collaboration";
import type { ProjectFile } from "~/types/file";
import getLanguageFromFilename from "~/lib/getLanguageFromFilename";
import getInitials from "~/lib/getInitials";

interface Props {
  selectedFile: ProjectFile;
  bearerToken: string;
  currentUserName: string;
  onError?: (error: any) => void;
}

interface ActiveUser extends UserPresenceMessage {
  color: string;
}

const USER_COLORS = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

const CollaborativeEditor = ({
  selectedFile,
  bearerToken,
  currentUserName,
  onError,
}: Props) => {
  const [content, setContent] = useState<string>("");
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [sessionId] = useState(uuidv4());
  const [isConnected, setIsConnected] = useState(false);
  const [initialContent, setInitialContent] = useState<string>("");

  const previousContentRef = useRef<string>("");
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isApplyingRemoteChangeRef = useRef(false);

  // Load file content with all changes applied
  useEffect(() => {
    const loadContent = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080/api";
        const response = await fetch(
          `${backendUrl}/documents/${selectedFile.id}/content`,
          {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.content;

        setContent(text);
        setInitialContent(text);
        previousContentRef.current = text;

        console.log(`📄 Loaded document with ${text.split('\n').length} lines`);
      } catch (error) {
        console.error("Error loading file:", error);
        if (onError) onError(error);
      }
    };

    loadContent();
  }, [selectedFile.id, bearerToken]);

  // Connect to WebSocket
  useEffect(() => {
    websocketService.connect(
      bearerToken,
      () => {
        console.log("✅ WebSocket connected for file:", selectedFile.id);
        setIsConnected(true);

        // Subscribe to document updates
        websocketService.subscribeToDocument(
          selectedFile.id,
          handleDocumentUpdate
        );

        // Subscribe to user presence
        websocketService.subscribeToPresence(
          selectedFile.id,
          handlePresenceUpdate
        );

        // Join the document
        websocketService.joinDocument(selectedFile.id, {
          fileId: selectedFile.id,
          cursorPosition: 0,
          currentLine: 0,
        });
      },
      (error) => {
        console.error("❌ WebSocket connection error:", error);
        setIsConnected(false);
        if (onError) onError(error);
      }
    );

    // Cleanup on unmount
    return () => {
      if (websocketService.isConnected()) {
        websocketService.leaveDocument(selectedFile.id, {
          fileId: selectedFile.id,
        });
      }
    };
  }, [selectedFile.id, bearerToken]);

  // Handle incoming document updates
  const handleDocumentUpdate = useCallback(
    (syncResponse: DocumentSyncResponse) => {
      console.log("📥 Received document update:", syncResponse);

      if (syncResponse.status === "SUCCESS" && syncResponse.deltas) {
        // Don't apply our own changes
        if (syncResponse.sessionId === sessionId) {
          return;
        }

        // Mark that we're applying a remote change to prevent echo
        isApplyingRemoteChangeRef.current = true;

        // Apply the deltas to the current content
        const lines = content.split("\n");

        syncResponse.deltas.forEach((delta: LineDelta) => {
          switch (delta.type) {
            case "INSERT":
              if (delta.newContent !== null) {
                lines.splice(delta.lineNumber, 0, delta.newContent);
              }
              break;
            case "DELETE":
              lines.splice(delta.lineNumber, 1);
              break;
            case "MODIFY":
              if (delta.newContent !== null) {
                lines[delta.lineNumber] = delta.newContent;
              }
              break;
          }
        });

        const newContent = lines.join("\n");
        setContent(newContent);
        previousContentRef.current = newContent;

        // Reset the flag after a short delay
        setTimeout(() => {
          isApplyingRemoteChangeRef.current = false;
        }, 100);
      }
    },
    [content, sessionId]
  );

  // Handle user presence updates
  const handlePresenceUpdate = useCallback((presence: UserPresenceMessage) => {
    console.log("👥 Presence update:", presence);

    setActiveUsers((prev) => {
      const filtered = prev.filter((u) => u.userId !== presence.userId);

      if (presence.status === "JOINED" || presence.status === "EDITING") {
        // Assign a color to this user
        const colorIndex = (presence.userId || 0) % USER_COLORS.length;
        const userWithColor: ActiveUser = {
          ...presence,
          color: USER_COLORS[colorIndex],
        };
        return [...filtered, userWithColor];
      } else if (presence.status === "LEFT") {
        return filtered;
      }

      return prev;
    });
  }, []);

  // Compute line-level deltas
  const computeDeltas = (oldText: string, newText: string): LineDelta[] => {
    const oldLines = oldText.split("\n");
    const newLines = newText.split("\n");
    const deltas: LineDelta[] = [];

    const minLines = Math.min(oldLines.length, newLines.length);

    // Check for modifications
    for (let i = 0; i < minLines; i++) {
      if (oldLines[i] !== newLines[i]) {
        deltas.push({
          lineNumber: i,
          type: "MODIFY" as DeltaType,
          oldContent: oldLines[i],
          newContent: newLines[i],
        });
      }
    }

    // Check for insertions
    if (newLines.length > oldLines.length) {
      for (let i = oldLines.length; i < newLines.length; i++) {
        deltas.push({
          lineNumber: i,
          type: "INSERT" as DeltaType,
          oldContent: null,
          newContent: newLines[i],
        });
      }
    }

    // Check for deletions
    if (oldLines.length > newLines.length) {
      for (let i = newLines.length; i < oldLines.length; i++) {
        deltas.push({
          lineNumber: i,
          type: "DELETE" as DeltaType,
          oldContent: oldLines[i],
          newContent: null,
        });
      }
    }

    return deltas;
  };

  // Handle editor change
  const handleEditorChange = (value: string | undefined) => {
    if (!value || isApplyingRemoteChangeRef.current) {
      return;
    }

    setContent(value);

    // Debounce sending changes to server
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const deltas = computeDeltas(previousContentRef.current, value);

      console.log(deltas)

      if (deltas.length > 0 && websocketService.isConnected()) {
        const editMessage = {
          fileId: selectedFile.id,
          sessionId,
          deltas,
          cursorPosition: editorRef.current?.getPosition()?.column || 0,
          currentLine: editorRef.current?.getPosition()?.lineNumber || 0,
        };

        websocketService.sendEdit(selectedFile.id, editMessage);
        previousContentRef.current = value;
      }
    }, 1000);
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
      {/* Header with active users */}
      <Box
        p="2"
        style={{
          borderBottom: "1px solid var(--gray-5)",
          backgroundColor: "var(--gray-2)",
        }}
      >
        <Flex justify="between" align="center">
          <Flex gap="2" align="center">
            <Badge color={isConnected ? "green" : "red"} variant="soft">
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Text size="2" weight="medium">
              {selectedFile.originalFileName}
            </Text>
          </Flex>

          <Flex gap="2" align="center">
            <Text size="1" color="gray">
              {activeUsers.length} active {activeUsers.length === 1 ? "user" : "users"}
            </Text>
            <Flex gap="1">
              {activeUsers.map((user) => (
                <Avatar
                  key={user.userId}
                  size="1"
                  fallback={getInitials(user.userName || "?")}
                  style={{
                    backgroundColor: user.color,
                    color: "white",
                  }}
                  title={`${user.userName} - Line ${user.currentLine}`}
                />
              ))}
            </Flex>
          </Flex>
        </Flex>
      </Box>

      {/* Monaco Editor */}
      <Box style={{ flex: 1 }}>
        <MonacoEditor
          height="100%"
          defaultLanguage={fileLanguage}
          language={fileLanguage}
          value={content}
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
