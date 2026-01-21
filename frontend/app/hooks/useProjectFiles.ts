import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { ProjectFile } from '../../types/file';
import {useRouteLoaderData} from "react-router";
import type {User} from "../../types/user";

interface UseProjectFilesOptions {
  baseProject: string;
  branch?: string;
  enabled?: boolean;
}

export function useProjectFiles({ baseProject, branch = "main", enabled = true }: UseProjectFilesOptions) {
  const { bearerToken} = useRouteLoaderData("auth-user") as {user: User, bearerToken: string}

  return useQuery({
    queryKey: ['projectFiles', baseProject, branch],
    queryFn: async () => {
      const response = await axios.get<ProjectFile[]>(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api/projects/${baseProject}/${branch}/files`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`
          }
        }
      );
      return response.data;
    },
    enabled: enabled && !!baseProject && !!bearerToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
