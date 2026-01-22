import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';
import type { GroupedChange } from '../../types/change';
import type { User } from '../../types/user';

interface UseRecentChangesOptions {
    baseProject: string;
    branch: string;
    limit?: number;
    enabled?: boolean;
}

export function useRecentChanges({ baseProject, branch, limit = 10, enabled = true }: UseRecentChangesOptions) {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };

    return useQuery({
        queryKey: ['recentChanges', baseProject, branch, limit],
        queryFn: async () => {
            const response = await axios.get<GroupedChange[]>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/${encodeURIComponent(branch)}/history?limit=${limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`
                    }
                }
            );
            return response.data;
        },
        enabled: enabled && !!baseProject && !!branch && !!bearerToken,
        staleTime: 1000 * 30, // 30 seconds
    });
}
