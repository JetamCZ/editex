import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';
import {useRouteLoaderData} from "react-router";
import type {User} from "../../types/user";
import type {AccessSummary, FolderPermission, FolderRole} from "../../types/permission";

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

function useToken() {
    const {bearerToken} = useRouteLoaderData("auth-user") as {user: User, bearerToken: string};
    return bearerToken;
}

export function useFolderPermissions(folderId: number | null) {
    const bearerToken = useToken();

    return useQuery({
        queryKey: ['folderPermissions', folderId],
        queryFn: async () => {
            const {data} = await axios.get<FolderPermission[]>(
                `${API}/api/folders/${folderId}/permissions`,
                {headers: {Authorization: `Bearer ${bearerToken}`}}
            );
            return data;
        },
        enabled: folderId != null && !!bearerToken,
    });
}

export function useGrantPermission(folderId: number | null) {
    const queryClient = useQueryClient();
    const bearerToken = useToken();

    return useMutation({
        mutationFn: async (vars: {email?: string; userId?: number; role: FolderRole}) => {
            const {data} = await axios.post<FolderPermission>(
                `${API}/api/folders/${folderId}/permissions`,
                vars,
                {headers: {Authorization: `Bearer ${bearerToken}`}}
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['folderPermissions', folderId]});
            queryClient.invalidateQueries({queryKey: ['accessSummary']});
        },
    });
}

export function useUpdatePermission(folderId: number | null) {
    const queryClient = useQueryClient();
    const bearerToken = useToken();

    return useMutation({
        mutationFn: async (vars: {userId: number; role: FolderRole}) => {
            const {data} = await axios.patch<FolderPermission>(
                `${API}/api/folders/${folderId}/permissions/${vars.userId}`,
                {role: vars.role},
                {headers: {Authorization: `Bearer ${bearerToken}`}}
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['folderPermissions', folderId]});
            queryClient.invalidateQueries({queryKey: ['accessSummary']});
        },
    });
}

export function useRevokePermission(folderId: number | null) {
    const queryClient = useQueryClient();
    const bearerToken = useToken();

    return useMutation({
        mutationFn: async (userId: number) => {
            await axios.delete(
                `${API}/api/folders/${folderId}/permissions/${userId}`,
                {headers: {Authorization: `Bearer ${bearerToken}`}}
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['folderPermissions', folderId]});
            queryClient.invalidateQueries({queryKey: ['accessSummary']});
        },
    });
}

export function useAccessSummary(baseProject: string | undefined) {
    const bearerToken = useToken();

    return useQuery({
        queryKey: ['accessSummary', baseProject],
        queryFn: async () => {
            const {data} = await axios.get<AccessSummary>(
                `${API}/api/projects/${baseProject}/access-summary`,
                {headers: {Authorization: `Bearer ${bearerToken}`}}
            );
            return data;
        },
        enabled: !!baseProject && !!bearerToken,
    });
}
