import { type LoaderFunctionArgs, Outlet } from "react-router";
import { getApiClient } from "../lib/axios.server";
import AppLayout from "../components/AppLayout";
import type { Project } from "../../types/project";

export async function loader({ request }: LoaderFunctionArgs) {
  const api = await getApiClient(request);

  const projectsResponse = await api.get<Project[]>('/projects/me');

  return { projects: projectsResponse.data };
}

export default function Dashboard() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
