import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';
import type { Branch } from '../../types/branch';
import type { User } from '../../types/user';

interface UseBranchesOptions {
    baseProject: string;
    enabled?: boolean;
}

export function useBranches({ baseProject, enabled = true }: UseBranchesOptions) {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };

    return useQuery({
        queryKey: ['branches', baseProject],
        queryFn: async () => {
            const response = await axios.get<Branch[]>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/branches`,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`
                    }
                }
            );
            return response.data;
        },
        enabled: enabled && !!baseProject && !!bearerToken,
        staleTime: 1000 * 60 * 5,
    });
}

interface CreateBranchParams {
    baseProject: string;
    branchName: string;
    sourceBranch?: string;
}

export function useCreateBranch() {
    const { bearerToken } = useRouteLoaderData("auth-user") as { user: User, bearerToken: string };
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ baseProject, branchName, sourceBranch = "main" }: CreateBranchParams) => {
            const response = await axios.post<Branch>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/branches`,
                { branchName, sourceBranch },
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
            queryClient.invalidateQueries({ queryKey: ['branches', variables.baseProject] });
        }
    });
}
