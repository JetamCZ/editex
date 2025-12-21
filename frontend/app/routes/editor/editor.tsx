import {Editor as MonacoEditor} from "@monaco-editor/react";
import {Box, Text} from "@radix-ui/themes";
import getLanguageFromFilename from "~/lib/getLanguageFromFilename";
import type {ProjectFile} from "../../../types/file";
import {useEffect, useState} from "react";
import {ContentType, typeMapping} from "~/const/ContentType";

interface Props {
    selectedFile: ProjectFile | undefined | null
}


const Editor = ({selectedFile}: Props) => {
    const isTextFile = selectedFile &&
        (typeMapping[selectedFile.fileType] === ContentType.TEXT || !typeMapping[selectedFile.fileType]);


    



    /*

    const fileContent = useFileContent(selectedFile)

    if (!selectedFile) {
        return (
            <Box p="3">
                <Text color="gray">Select a file from the tree to view its contents</Text>
            </Box>
        )
    }

    if (!fileContent) {
        return (
            <Box p="3">
                <Text color="gray">Loading...</Text>
            </Box>
        )
    }

    const fileLanguage = getLanguageFromFilename(selectedFile.originalFileName)

    if (fileContent.type === "image") {
        return (
            <img src={fileContent.url} alt=""/>
        )
    }

    return (
        <MonacoEditor
            height="100%"
            defaultLanguage={fileLanguage}
            language={fileLanguage}
            value={fileContent.content}
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

     */
}


export default Editor

const useFileContent = (file?: ProjectFile) => {
    const [content, setContent] = useState<{ type: string, content?: string, url?: string } | null>(null);

    const loadText = async (s3Url: string) => {
        const response = await fetch(s3Url);
        const content = await response.text();

        setContent({
            type: ContentType.TEXT,
            url: s3Url,
            content
        })
    }

    useEffect(() => {
        if (!file) {
            setContent(null)
            return
        }

        const type = typeMapping[file.fileType] ?? ContentType.UNKNOWN

        if(type === ContentType.TEXT) {
            loadText(file.s3Url)
        } else {
            setContent({
                type,
                url: file.s3Url,
                content: ""
            })
        }
    }, [file])

    return content
}
