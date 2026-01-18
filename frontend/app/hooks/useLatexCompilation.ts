import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';

interface CompilationRequest {
    fileId: string;
}

interface CompilationResult {
    success: boolean;
    pdfFileId: string | null;
    pdfUrl: string | null;
    compilationLog: string;
    errorMessage: string | null;
    compilationTimeMs: number;
}

export function useLatexCompilation() {
    const authData = useRouteLoaderData("auth-user") as { bearerToken: string } | undefined;
    const bearerToken = authData?.bearerToken;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (request: CompilationRequest) => {
            const response = await axios.post<CompilationResult>(
                `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/latex/compile`,
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
        onSuccess: () => {
            // Invalidate project files to show the new PDF
            queryClient.invalidateQueries({
                queryKey: ['projectFiles']
            });
        }
    });
}

export type { CompilationResult };
