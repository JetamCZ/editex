import {Editor as MonacoEditor} from "@monaco-editor/react";
import {Box, Text} from "@radix-ui/themes";
import getLanguageFromFilename from "~/lib/getLanguageFromFilename";
import type { ProjectFile } from "../../../types/file";

interface Props {
    selectedFile: ProjectFile | undefined | null
}


const Editor = ({selectedFile}: Props) => {
    const fileContent = useFileContent(selectedFile?.projectId, selectedFile?.id)

    if (!selectedFile) {
        return (
            <Box p="3">
                <Text color="gray">Select a file from the tree to view its contents</Text>
            </Box>
        )
    }

    const fileLanguage = getLanguageFromFilename(selectedFile.originalFileName)

    return (
        <MonacoEditor
            height="100%"
            defaultLanguage={fileLanguage}
            language={fileLanguage}
            value={fileContent}
            theme="light"
            options={{
                minimap: {enabled: false},
                fontSize: 14,
                lineNumbers: "on",
                readOnly: false,
                wordWrap: "on",
            }}
        />
    )
}


export default Editor

const useFileContent = (projectId?: string, fileId?: string) => {
    if(!projectId || !fileId) return "";

    return `CONTENT ${new Date().toLocaleString()}`
}
