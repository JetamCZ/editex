import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';
import type { User } from '../../types/user';

interface MoveFileParams {
    fileId: string;
    targetFolder: string;
}

interface UseMoveFileOptions {
    projectId: number;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export function useMoveFile({ projectId, onSuccess, onError }: UseMoveFileOptions) {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User; bearerToken: string };
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ fileId, targetFolder }: MoveFileParams) => {
            const response = await axios.patch(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/files/${fileId}/move`,
                { targetFolder },
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });
            onSuccess?.();
        },
        onError: (error: Error) => {
            onError?.(error);
        }
    });
}
