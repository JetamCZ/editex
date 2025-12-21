import type {ProjectFile} from "../../../types/file";
import useFileContent from "~/components/CollaborationEditor/hooks/useFileContent";
import {useChangeTracking, type ChangeOperation} from "~/components/CollaborationEditor/hooks/useChangeTracking";
import {useWebSocket} from "~/components/CollaborationEditor/hooks/useWebSocket";
import Editor from "@monaco-editor/react";
import getLanguage from "~/components/CollaborationEditor/lib/getLanguage";
import {useRef, useEffect, useCallback} from "react";
import type {editor} from "monaco-editor";
import {Button, Badge} from "@radix-ui/themes";
import useContentProcessor from "~/components/CollaborationEditor/hooks/useContentProcessor";
import useContent from "~/components/CollaborationEditor/hooks/useContent";

interface Props {
    selectedFile: ProjectFile
}

const CollaborativeEditor = (props: Props) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    //const {refetch, ...fileContent} = useFileContent(props.selectedFile)
    const {changeHistory, setChangeHistory, detectChanges, resetTracking, previousLinesRef, updatePreviousLines, setIsApplyingRemoteChanges} = useChangeTracking();

    //const {content, handleChanges: onChangesReceived} = useContentProcessor(fileContent.content!, changeHistory, setChangeHistory, updatePreviousLines)


    const setEditorContent = useCallback((newContent: string) => {
        if (editorRef.current) {
            const model = editorRef.current.getModel();

            if (model) {
                // Save cursor position before updating content
                const position = editorRef.current.getPosition();
                const scrollTop = editorRef.current.getScrollTop();

                // Set the new content
                editorRef.current.setValue(newContent);

                // Update the language mode
                const language = getLanguage(props.selectedFile.originalFileName);
                const monaco = (window as any).monaco;
                if (monaco) {
                    monaco.editor.setModelLanguage(model, language);
                }

                // Restore cursor position if it was saved
                if (position) {
                    editorRef.current.setPosition(position);
                    editorRef.current.setScrollTop(scrollTop);
                }
            }
        }
    }, [props.selectedFile.originalFileName])


    const {content, refetch, lastChangeId, handleChanges: onChangesReceived} = useContent(
        props.selectedFile.id,
        changeHistory,
        setChangeHistory,
        updatePreviousLines,
        setEditorContent,
        setIsApplyingRemoteChanges
    )

    const {isConnected, sessionId, sendChanges} = useWebSocket({
        fileId: props.selectedFile.id,
        onChangesReceived
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
            sendChanges(changeHistory, lastChangeId!);
            console.log(`Sent ${changeHistory.length} changes to server`);

            // Clear the local changes history after successfully sending
            const model = editorRef.current?.getModel();
            if (model) {
                resetTracking(model.getLinesContent());
            }
        } else {
            console.log('No changes to send');
        }
    };

    const handleReloadFile = async () => {
        console.log('Reloading file from server...');
        await refetch();
    };

    return <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px', borderBottom: '1px solid #e0e0e0', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button onClick={handleReloadFile} size="2" variant="soft">
                    Reload from Server
                </Button>
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
                defaultValue={content || ''}
                theme="vs-light"
                onMount={handleEditorDidMount}
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
