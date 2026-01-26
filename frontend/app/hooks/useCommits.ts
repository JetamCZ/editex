import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';
import type { Commit, CreateCommitRequest, BranchPendingChanges, FileDiff } from '../../types/commit';
import type { User } from '../../types/user';

interface UseCommitsOptions {
    baseProject: string;
    branch?: string;
    enabled?: boolean;
}

export function useCommits({ baseProject, branch, enabled = true }: UseCommitsOptions) {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };

    return useQuery({
        queryKey: ['commits', baseProject, branch],
        queryFn: async () => {
            const url = branch
                ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/commits?branch=${encodeURIComponent(branch)}`
                : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/commits`;

            const response = await axios.get<Commit[]>(url, {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`
                }
            });
            return response.data;
        },
        enabled: enabled && !!baseProject && !!bearerToken,
        staleTime: 1000 * 60 * 5,
    });
}

interface CreateCommitParams {
    baseProject: string;
    message: string;
    branch: string;
}

export function useCreateCommit() {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ baseProject, message, branch }: CreateCommitParams) => {
            const response = await axios.post<Commit>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/commits`,
                { message, branch } as CreateCommitRequest,
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
            queryClient.invalidateQueries({ queryKey: ['commits', variables.baseProject] });
            queryClient.invalidateQueries({ queryKey: ['pendingChanges', variables.baseProject] });
        }
    });
}

interface UsePendingChangesOptions {
    baseProject: string;
    enabled?: boolean;
}

export function usePendingChanges({ baseProject, enabled = true }: UsePendingChangesOptions) {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };

    return useQuery({
        queryKey: ['pendingChanges', baseProject],
        queryFn: async () => {
            const response = await axios.get<BranchPendingChanges[]>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/commits/pending-changes`,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`
                    }
                }
            );
            return response.data;
        },
        enabled: enabled && !!baseProject && !!bearerToken,
        staleTime: 1000 * 30, // 30 seconds - refresh more frequently for pending changes
    });
}

interface DiscardChangesParams {
    baseProject: string;
    branch: string;
}

export function useDiscardChanges() {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ baseProject, branch }: DiscardChangesParams) => {
            await axios.delete(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/commits/discard?branch=${encodeURIComponent(branch)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`
                    }
                }
            );
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['commits', variables.baseProject] });
            queryClient.invalidateQueries({ queryKey: ['pendingChanges', variables.baseProject] });
        }
    });
}

interface UseUncommittedDiffOptions {
    baseProject: string;
    branch: string;
    enabled?: boolean;
}

export function useUncommittedDiff({ baseProject, branch, enabled = true }: UseUncommittedDiffOptions) {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };

    return useQuery({
        queryKey: ['uncommittedDiff', baseProject, branch],
        queryFn: async () => {
            const response = await axios.get<FileDiff[]>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/commits/diff?branch=${encodeURIComponent(branch)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`
                    }
                }
            );
            return response.data;
        },
        enabled: enabled && !!baseProject && !!branch && !!bearerToken,
        staleTime: 1000 * 10, // 10 seconds
    });
}
