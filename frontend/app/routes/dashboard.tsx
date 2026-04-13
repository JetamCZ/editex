import { type LoaderFunctionArgs, Outlet } from "react-router";
import { getApiClient } from "../lib/axios.server";
import AppLayout from "../components/AppLayout";
import type { Project } from "../../types/project";
import i18n from '~/i18n';

export function meta() {
    return [
        { title: i18n.t('dashboard.meta.title') },
        { name: "description", content: i18n.t('dashboard.meta.description') },
    ];
}

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
