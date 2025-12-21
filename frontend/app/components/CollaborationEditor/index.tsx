import type {ProjectFile} from "../../../types/file";
import useFileContent from "~/components/CollaborationEditor/hooks/useFileContent";
import {useChangeTracking} from "~/components/CollaborationEditor/hooks/useChangeTracking";
import Editor from "@monaco-editor/react";
import getLanguage from "~/components/CollaborationEditor/lib/getLanguage";
import {useRef, useEffect} from "react";
import type {editor} from "monaco-editor";
import {Button} from "@radix-ui/themes";

interface Props {
    selectedFile: ProjectFile
}

const CollaborativeEditor = (props: Props) => {
    const content = useFileContent(props.selectedFile)
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const {changeHistory, detectChanges, resetTracking, previousLinesRef} = useChangeTracking();

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
            }
        }
    }, [content?.content, props.selectedFile.id, props.selectedFile.originalFileName, resetTracking]);



    return <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px', borderBottom: '1px solid #e0e0e0', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button onClick={handleShowChanges} size="2">
                Show Change History
            </Button>
            <span style={{ fontSize: '14px', color: '#666' }}>
                {changeHistory.length} change{changeHistory.length !== 1 ? 's' : ''} tracked
            </span>
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
