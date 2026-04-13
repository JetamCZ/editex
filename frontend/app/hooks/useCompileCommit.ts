import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';
import type { CompilationResult } from './useLatexCompilation';

interface CompileCommitRequest {
    baseProject: string;
    branch: string;
    commitHash: string;
}

export function useCompileCommit() {
    const authData = useRouteLoaderData("auth-user") as { bearerToken: string } | undefined;
    const bearerToken = authData?.bearerToken;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (request: CompileCommitRequest) => {
            const response = await axios.post<CompilationResult>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/latex/compile-commit`,
                request,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': 'application/json',
                    }
                }
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['projectVersionPdfs', variables.baseProject, variables.branch]
            });
        }
    });
}
