import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';

export interface ProjectVersionPdfInfo {
    hash: string;
    message: string | null;
    createdAt: string | null;
    hasPdf: boolean;
    pdfUrl: string | null;
}

export function useProjectVersionPdfs(projectId: number) {
    const authData = useRouteLoaderData("auth-user") as { bearerToken: string } | undefined;
    const bearerToken = authData?.bearerToken;

    return useQuery({
        queryKey: ['projectVersionPdfs', projectId],
        queryFn: async () => {
            const response = await axios.get<ProjectVersionPdfInfo[]>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/latex/pdfs/${projectId}`,
                {
                    headers: { 'Authorization': `Bearer ${bearerToken}` }
                }
            );
            return response.data;
        },
        enabled: !!bearerToken && !!projectId,
    });
}
