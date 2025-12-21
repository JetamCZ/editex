import type {ProjectFile} from "../../../../types/file";
import {ContentType} from "~/const/ContentType";
import {useQuery} from "@tanstack/react-query";
import useAuth from "~/hooks/useAuth";

const useFileContent = (file?: ProjectFile) => {
    const {bearerToken} = useAuth();

    const {data: content} = useQuery({
        queryKey: ['fileContent', file?.id],
        queryFn: async () => {
            if (!file || !bearerToken) return null;

            try {
                // Fetch file content from backend API
                const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
                const response = await fetch(`${baseUrl}/api/files/${file.id}/content`, {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Failed to fetch file content:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText,
                        fileId: file.id,
                        hasToken: !!bearerToken
                    });
                    throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Successfully fetched file content:', {
                    fileId: file.id,
                    hasContent: !!data.content,
                    lastChangeId: data.lastChangeId
                });

                return {
                    type: ContentType.TEXT,
                    url: file.s3Url,
                    content: data.content,
                    lastChangeId: data.lastChangeId,
                    fileName: data.fileName,
                    fileType: data.fileType
                };
            } catch (error) {
                console.error('Error loading file content:', error);
                throw error;
            }
        },
        enabled: !!file && !!bearerToken,
        staleTime: 0, // Always fetch fresh content
        refetchOnMount: true,
    });

    return content;
}


export default useFileContent;
