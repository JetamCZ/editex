import type {ProjectFile} from "../../../../types/file";
import {useQuery} from "@tanstack/react-query";
import useAuth from "~/hooks/useAuth";
import axios from "axios";

const useFileContent = (file?: ProjectFile) => {
    const {bearerToken} = useAuth();

    const {data: content, refetch} = useQuery({
        queryKey: ['fileContent', file?.id],
        queryFn: async () => {
            if (!file || !bearerToken) return null;

            try {
                const {data} = await axios.get<{content: string, lastChangeId: string}>(`/files/${file.id}/content`, {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json',
                    },
                    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api'
                });

                return data;
            } catch (error) {
                console.error('Error loading file content:', error);
                throw error;
            }
        },
        enabled: !!file && !!bearerToken,
        staleTime: 0, // Always fetch fresh content
        refetchOnMount: true,
    });

    return {content, refetch};
}


export default useFileContent;
