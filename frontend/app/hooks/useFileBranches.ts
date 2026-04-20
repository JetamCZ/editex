import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { FileBranch, FileCommit } from '../../types/file';
import useAuth from '~/hooks/useAuth';

export interface MergePreviewResponse {
    content: string;
    hasConflicts: boolean;
    conflictCount: number;
}

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

function useAuthHeaders() {
    const { bearerToken } = useAuth();
    return {
        headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
        },
        baseURL: BASE_URL,
    };
}

export function useFileBranches(fileId: string | null, includeDeleted = false) {
    const config = useAuthHeaders();

    return useQuery({
        queryKey: ['fileBranches', fileId, includeDeleted],
        queryFn: async () => {
            const { data } = await axios.get<FileBranch[]>(
                `/api/files/${fileId}/branches`,
                { ...config, params: includeDeleted ? { includeDeleted: true } : undefined }
            );
            return data;
        },
        enabled: !!fileId,
    });
}

export function useCreateBranch() {
    const config = useAuthHeaders();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ fileId, name, sourceBranch }: {
            fileId: string;
            name: string;
            sourceBranch?: string;
        }) => {
            const { data } = await axios.post<FileBranch>(
                `/api/files/${fileId}/branches`,
                { name, sourceBranch },
                config
            );
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['fileBranches', variables.fileId] });
        },
    });
}

export function useDeleteBranch() {
    const config = useAuthHeaders();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ fileId, branchId }: { fileId: string; branchId: number }) => {
            await axios.delete(`/api/files/${fileId}/branches/${branchId}`, config);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['fileBranches', variables.fileId] });
        },
    });
}

export function useRenameBranch() {
    const config = useAuthHeaders();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ fileId, branchId, name }: {
            fileId: string;
            branchId: number;
            name: string;
        }) => {
            const { data } = await axios.patch<FileBranch>(
                `/api/files/${fileId}/branches/${branchId}`,
                { name },
                config
            );
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['fileBranches', variables.fileId] });
            queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
        },
    });
}

export function useSetActiveBranch() {
    const config = useAuthHeaders();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ fileId, branchId }: { fileId: string; branchId: number }) => {
            await axios.put(`/api/files/${fileId}/active-branch`, { branchId }, config);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['fileBranches', variables.fileId] });
            queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
        },
    });
}

export function useBranchCommits(branchId: number | null) {
    const config = useAuthHeaders();

    return useQuery({
        queryKey: ['branchCommits', branchId],
        queryFn: async () => {
            const { data } = await axios.get<FileCommit[]>(
                `/api/branches/${branchId}/commits`, config
            );
            return data;
        },
        enabled: !!branchId,
    });
}

export function useCreateCommit() {
    const config = useAuthHeaders();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ branchId, message }: { branchId: number; message?: string }) => {
            const { data } = await axios.post<FileCommit>(
                `/api/branches/${branchId}/commits`,
                { message },
                config
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['branchCommits', data.branchId] });
        },
    });
}

export function useMergePreviewQuery(sourceBranchId: number | null, targetBranchId: number | null) {
    const config = useAuthHeaders();
    return useQuery({
        queryKey: ['mergePreview', sourceBranchId, targetBranchId],
        queryFn: async () => {
            const { data } = await axios.get<MergePreviewResponse>(
                `/api/branches/${sourceBranchId}/merge-preview/${targetBranchId}`,
                config
            );
            return data;
        },
        enabled: false, // only fetched via refetch()
        staleTime: 0,
        retry: false,
    });
}

export function useMergeBranch() {
    const config = useAuthHeaders();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sourceBranchId, targetBranchId, fileId, resolvedContent }: {
            sourceBranchId: number;
            targetBranchId: number;
            fileId: string;
            resolvedContent: string;
        }) => {
            const { data } = await axios.post<FileCommit>(
                `/api/branches/${sourceBranchId}/merge`,
                { targetBranchId, resolvedContent },
                config
            );
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['branchCommits'] });
            queryClient.invalidateQueries({ queryKey: ['fileBranches', variables.fileId] });
            queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
        },
    });
}

export function useBranchDiff(sourceBranchId: number | null, targetBranchId: number | null) {
    const config = useAuthHeaders();

    return useQuery({
        queryKey: ['branchDiff', sourceBranchId, targetBranchId],
        queryFn: async () => {
            const { data } = await axios.get<{ sourceContent: string; targetContent: string }>(
                `/api/branches/${sourceBranchId}/diff/${targetBranchId}`, config
            );
            return data;
        },
        enabled: !!sourceBranchId && !!targetBranchId,
    });
}
