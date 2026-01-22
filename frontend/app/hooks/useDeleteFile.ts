import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRouteLoaderData } from 'react-router';
import type { User } from '../../types/user';

interface UseDeleteFileOptions {
  baseProject: string;
  branch: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeleteFile({ baseProject, branch, onSuccess, onError }: UseDeleteFileOptions) {
  const { bearerToken } = useRouteLoaderData("auth-user") as { user: User; bearerToken: string };
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/files/${fileId}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles', baseProject, branch] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      onError?.(error);
    }
  });
}
