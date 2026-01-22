import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';
import type { User } from '../../types/user';
import type {
    MergePreviewRequest,
    MergePreviewResponse,
    MergeExecuteRequest,
    MergeExecuteResponse,
} from '../../types/merge';

interface UseMergePreviewOptions {
    baseProject: string;
    sourceBranch: string;
    targetBranch: string;
    enabled?: boolean;
}

export function useMergePreview({ baseProject, sourceBranch, targetBranch, enabled = true }: UseMergePreviewOptions) {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };

    return useQuery({
        queryKey: ['mergePreview', baseProject, sourceBranch, targetBranch],
        queryFn: async () => {
            const request: MergePreviewRequest = { sourceBranch, targetBranch };
            const response = await axios.post<MergePreviewResponse>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/merge/preview`,
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
        enabled: enabled && !!baseProject && !!sourceBranch && !!targetBranch && !!bearerToken,
        staleTime: 1000 * 30, // 30 seconds
    });
}

interface ExecuteMergeParams {
    baseProject: string;
    request: MergeExecuteRequest;
}

export function useExecuteMerge() {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ baseProject, request }: ExecuteMergeParams) => {
            const response = await axios.post<MergeExecuteResponse>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/merge/execute`,
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
        onSuccess: (_, variables) => {
            // Invalidate branches and files queries after successful merge
            queryClient.invalidateQueries({ queryKey: ['branches', variables.baseProject] });
            queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
            queryClient.invalidateQueries({ queryKey: ['mergePreview'] });
        }
    });
}

interface UseFileContentOptions {
    baseProject: string;
    branch: string;
    fileId: string;
    enabled?: boolean;
}

export function useFileContent({ baseProject, branch, fileId, enabled = true }: UseFileContentOptions) {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };

    return useQuery({
        queryKey: ['fileContent', baseProject, branch, fileId],
        queryFn: async () => {
            const response = await axios.get<string>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/${branch}/content/${fileId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`
                    }
                }
            );
            return response.data;
        },
        enabled: enabled && !!baseProject && !!branch && !!fileId && !!bearerToken,
        staleTime: 1000 * 60, // 1 minute
    });
}
