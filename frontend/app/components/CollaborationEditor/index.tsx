import type {ProjectFile} from "../../../types/file";
import useFileContent from "~/components/CollaborationEditor/hooks/useFileContent";
import Editor from "@monaco-editor/react";
import getLanguage from "~/components/CollaborationEditor/lib/getLanguage";
import {useRef, useEffect} from "react";
import type {editor} from "monaco-editor";

interface Props {
    selectedFile: ProjectFile
}

const CollaborativeEditor = (props: Props) => {
    const content = useFileContent(props.selectedFile)
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;
    };

    const handleEditorChange = (value: string | undefined) => {
        console.log('Editor content changed:', value);
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
            }
        }
    }, [content?.content, props.selectedFile.id, props.selectedFile.originalFileName]);



    return <div style={{ height: '100%', width: '100%' }}>
        <Editor
            height="100vh"
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
}

export default CollaborativeEditor
