import {useMutation, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';
import {useRouteLoaderData} from "react-router";
import type {User} from "../../types/user";
import type {ProjectFolder} from "../../types/permission";

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

function useToken() {
    const {bearerToken} = useRouteLoaderData("auth-user") as {user: User, bearerToken: string};
    return bearerToken;
}

export function useCreateFolder(projectId: number) {
    const queryClient = useQueryClient();
    const bearerToken = useToken();
    return useMutation({
        mutationFn: async (vars: {parentId: number; name: string}) => {
            const {data} = await axios.post<ProjectFolder>(
                `${API}/api/folders`,
                vars,
                {headers: {Authorization: `Bearer ${bearerToken}`}}
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['projectFolders', projectId]});
            queryClient.invalidateQueries({queryKey: ['projectFiles', projectId]});
        },
    });
}

export function useDeleteFolder(projectId: number) {
    const queryClient = useQueryClient();
    const bearerToken = useToken();
    return useMutation({
        mutationFn: async (folderId: number) => {
            await axios.delete(
                `${API}/api/folders/${folderId}`,
                {headers: {Authorization: `Bearer ${bearerToken}`}}
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['projectFolders', projectId]});
            queryClient.invalidateQueries({queryKey: ['projectFiles', projectId]});
        },
    });
}

export function useRenameFolder(projectId: number) {
    const queryClient = useQueryClient();
    const bearerToken = useToken();
    return useMutation({
        mutationFn: async (vars: {folderId: number; name: string}) => {
            const {data} = await axios.patch<ProjectFolder>(
                `${API}/api/folders/${vars.folderId}`,
                {name: vars.name},
                {headers: {Authorization: `Bearer ${bearerToken}`}}
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['projectFolders', projectId]});
            queryClient.invalidateQueries({queryKey: ['projectFiles', projectId]});
        },
    });
}
