import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { FileBranch, FileCommit } from '../../types/file';
import useAuth from '~/hooks/useAuth';

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

export function useFileBranches(fileId: string | null) {
    const config = useAuthHeaders();

    return useQuery({
        queryKey: ['fileBranches', fileId],
        queryFn: async () => {
            const { data } = await axios.get<FileBranch[]>(
                `/api/files/${fileId}/branches`, config
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
        mutationFn: async ({ fileId, branchId }: { fileId: string; branchId: string }) => {
            await axios.delete(`/api/files/${fileId}/branches/${branchId}`, config);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['fileBranches', variables.fileId] });
        },
    });
}

export function useSetActiveBranch() {
    const config = useAuthHeaders();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ fileId, branchId }: { fileId: string; branchId: string }) => {
            await axios.put(`/api/files/${fileId}/active-branch`, { branchId }, config);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['fileBranches', variables.fileId] });
            queryClient.invalidateQueries({ queryKey: ['projectFiles'] });
        },
    });
}

export function useBranchCommits(branchId: string | null) {
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
        mutationFn: async ({ branchId, message }: { branchId: string; message?: string }) => {
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

export function useMergeBranch() {
    const config = useAuthHeaders();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sourceBranchId, targetBranchId }: {
            sourceBranchId: string;
            targetBranchId: string;
        }) => {
            const { data } = await axios.post<FileCommit>(
                `/api/branches/${sourceBranchId}/merge`,
                { targetBranchId },
                config
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branchCommits'] });
        },
    });
}

export function useBranchDiff(sourceBranchId: string | null, targetBranchId: string | null) {
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
