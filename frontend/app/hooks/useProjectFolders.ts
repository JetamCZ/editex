import {useQuery} from '@tanstack/react-query';
import axios from 'axios';
import {useRouteLoaderData} from "react-router";
import type {User} from "../../types/user";
import type {ProjectFolder} from "../../types/permission";

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export function useProjectFolders(projectId: number | undefined, enabled: boolean = true) {
    const {bearerToken} = useRouteLoaderData("auth-user") as {user: User, bearerToken: string};

    return useQuery({
        queryKey: ['projectFolders', projectId],
        queryFn: async () => {
            const {data} = await axios.get<ProjectFolder[]>(
                `${API}/api/projects/${projectId}/folders`,
                {headers: {Authorization: `Bearer ${bearerToken}`}}
            );
            return data;
        },
        enabled: enabled && !!projectId && !!bearerToken,
        staleTime: 1000 * 60,
    });
}
