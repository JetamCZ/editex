import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';
import i18n from '../i18n';

interface AiDebugRequest {
    projectId: number;
    sourceFile?: string;
    errorMessage?: string | null;
    compilationLog?: string | null;
    language?: string;
}

interface AiDebugResult {
    success: boolean;
    explanation: string | null;
    errorMessage: string | null;
    model: string | null;
}

export function useAiDebug() {
    const authData = useRouteLoaderData("auth-user") as { bearerToken: string } | undefined;
    const bearerToken = authData?.bearerToken;

    return useMutation({
        mutationFn: async (request: AiDebugRequest) => {
            const response = await axios.post<AiDebugResult>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/latex/ai-debug`,
                {
                    ...request,
                    language: request.language || i18n.language || 'en',
                },
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        },
    });
}

export type { AiDebugResult };
