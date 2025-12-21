import type {ProjectFile} from "../../../types/file";
import useFileContent from "~/components/CollaborationEditor/hooks/useFileContent";
import {useChangeTracking, type ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";
import {useWebSocket} from "~/components/CollaborationEditor/hooks/useWebSocket";
import Editor from "@monaco-editor/react";
import getLanguage from "~/components/CollaborationEditor/lib/getLanguage";
import {useRef, useEffect, useState, useCallback} from "react";
import type {editor} from "monaco-editor";
import {Button, Badge} from "@radix-ui/themes";

interface Props {
    selectedFile: ProjectFile
}

const CollaborativeEditor = (props: Props) => {
    const content = useFileContent(props.selectedFile)

    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const [baseChangeId, setBaseChangeId] = useState<string | null>(null);

    const {changeHistory, detectChanges, resetTracking, previousLinesRef} = useChangeTracking();

    const handleIncomingChanges = useCallback((
        changes: ChangeOperation[],
        sessionId: string,
        userId: number,
        userName: string
    ) => {
        console.log(`Received changes from ${userName} (session: ${sessionId}):`, changes);
        // TODO: Apply incoming changes to the editor
        // This would involve implementing operational transform or CRDT logic
    }, []);

    const {isConnected, sessionId, sendChanges} = useWebSocket({
        fileId: props.selectedFile.id,
        onChangesReceived: handleIncomingChanges
    });

    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;

        // Initialize previous lines with the current content
        const model = editor.getModel();
        if (model) {
            previousLinesRef.current = model.getLinesContent();
        }

        // Listen to content changes with detailed change information
        editor.onDidChangeModelContent((e) => {
            const model = editor.getModel();
            if (model) {
                detectChanges(e, model);
            }
        });
    };

    const handleShowChanges = () => {
        console.log('Change History:', changeHistory);
    };

    const handleSendChanges = () => {
        if (changeHistory.length > 0) {
            sendChanges(changeHistory, baseChangeId);
            console.log(`Sent ${changeHistory.length} changes to server`);
        } else {
            console.log('No changes to send');
        }
    };

    const handleEditorChange = (value: string | undefined) => {
        // Changes are now handled by onDidChangeModelContent
    };

    // Update editor content when file changes
    useEffect(() => {
        if (editorRef.current && content?.content !== undefined) {
            const model = editorRef.current.getModel();
            if (model) {
                // Set the new content
                editorRef.current.setValue(content.content);

                // Update the language mode
                const language = getLanguage(props.selectedFile.originalFileName);
                const monaco = (window as any).monaco;
                if (monaco) {
                    monaco.editor.setModelLanguage(model, language);
                }

                // Reset change tracking for new file
                resetTracking(model.getLinesContent());

                // Set base change ID from content (loaded from backend)
                setBaseChangeId(content.lastChangeId || null);
                console.log('Loaded file with base change ID:', content.lastChangeId);
            }
        }
    }, [content?.content, content?.lastChangeId, props.selectedFile.id, props.selectedFile.originalFileName, resetTracking]);



    return <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px', borderBottom: '1px solid #e0e0e0', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button onClick={handleShowChanges} size="2" variant="soft">
                    Show Changes
                </Button>
                <Button onClick={handleSendChanges} size="2" disabled={changeHistory.length === 0 || !isConnected}>
                    Send Changes
                </Button>
                <span style={{ fontSize: '14px', color: '#666' }}>
                    {changeHistory.length} change{changeHistory.length !== 1 ? 's' : ''} tracked
                </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Badge color={isConnected ? 'green' : 'gray'} variant="soft">
                    {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                <span style={{ fontSize: '12px', color: '#999' }}>
                    Session: {sessionId.substring(0, 8)}...
                </span>
            </div>
        </div>
        <div style={{ flex: 1 }}>
            <Editor
                height="100%"
                defaultLanguage={getLanguage(props.selectedFile.originalFileName)}
                defaultValue={content?.content || ''}
                theme="vs-light"
                onMount={handleEditorDidMount}
                onChange={handleEditorChange}
                options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                }}
            />
        </div>
    </div>
}

export default CollaborativeEditor
