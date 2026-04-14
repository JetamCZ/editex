import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';

interface DownloadRequest {
    baseProject: string;
    branch?: string;
    commitHash?: string;
}

export function useProjectDownload() {
    const authData = useRouteLoaderData("auth-user") as { bearerToken: string } | undefined;
    const bearerToken = authData?.bearerToken;

    return useMutation({
        mutationFn: async (request: DownloadRequest) => {
            const response = await axios.post<{ zipUrl: string }>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/latex/download`,
                request,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        },
    });
}
