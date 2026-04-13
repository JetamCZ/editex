import {Link, Outlet, useLoaderData, useNavigate, useLocation, type LoaderFunctionArgs} from "react-router";
import {getApiClient} from "~/lib/axios.server";
import type {Project} from "../../../types/project";
import {Text, Avatar, DropdownMenu, Tooltip} from "@radix-ui/themes";
import {
    FileTextIcon,
    GearIcon,
    QuestionMarkCircledIcon,
    ExitIcon,
} from "@radix-ui/react-icons";
import useAuth from "~/hooks/useAuth";
import getInitials from "~/lib/getInitials";
import type {ReactNode} from "react";

export function meta({ data }: { data: { project: Project } | undefined }) {
    const projectName = data?.project?.name || "Project";
    return [
        { title: `${projectName} - Editex` },
        { name: "description", content: `Edit ${projectName} in Editex` },
    ];
}

export async function loader({request, params}: LoaderFunctionArgs) {
    const api = await getApiClient(request);
    const {baseProject, branch = "main"} = params;

    try {
        const {data: project} = await api.get<Project>(`/projects/${baseProject}/${branch}`);
        return {project};
    } catch (error) {
        console.error("Error loading project:", error);
        throw new Response("Project not found", {status: 404});
    }
}

const iconSidebarItems = [
    {id: 'files', icon: <FileTextIcon width="20" height="20" />, tooltip: 'Files', path: ''},
];

const iconSidebarBottomItems = [
    {id: 'help', icon: <QuestionMarkCircledIcon width="20" height="20" />, tooltip: 'Help', path: '/help'},
    {id: 'settings', icon: <GearIcon width="20" height="20" />, tooltip: 'Settings', path: '/settings'},
];

interface ProjectLayoutProps {
    headerActions?: ReactNode;
}

export default function ProjectLayout() {
    const {project} = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const location = useLocation();
    const {user} = useAuth();
    const initials = getInitials(user?.name || user?.email || "U");

    const isSettingsPage = location.pathname.endsWith('/settings');
    const isHelpPage = location.pathname.endsWith('/help');
    const handleIconClick = (itemId: string, path: string) => {
        if (path) {
            navigate(`/project/${project.baseProject}/${project.branch}${path}`);
        } else if (itemId === 'files') {
            navigate(`/project/${project.baseProject}/${project.branch}`);
        }
    };

    const getActiveItem = () => {
        if (isSettingsPage) return 'settings';
        if (isHelpPage) return 'help';
        return 'files';
    };

    const activeItem = getActiveItem();

    return (
        <div style={{height: "100vh", display: "flex", flexDirection: "column"}}>
            {/* Top Header Bar */}
            <header style={{
                height: "56px",
                backgroundColor: "#fff",
                borderBottom: "1px solid var(--gray-6)",
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                gap: "24px",
                flexShrink: 0
            }}>
                <Link to="/dashboard" style={{display: "flex", alignItems: "center", gap: "8px", textDecoration: "none"}}>
                    <img src="/logo.svg" style={{height: "32px"}} alt="Editex" />
                </Link>

                <nav style={{display: "flex", gap: "16px"}}>
                    <Link to="/dashboard" style={{textDecoration: "none"}}>
                        <Text size="2" style={{color: "var(--gray-11)"}}>Projects</Text>
                    </Link>
                    {/* TODO: Uncomment when templates page is implemented
                    <Link to="/dashboard" style={{textDecoration: "none"}}>
                        <Text size="2" style={{color: "var(--gray-11)"}}>Templates</Text>
                    </Link>
                    */}
                    {/* TODO: Uncomment when settings page is fully implemented
                    <Link to={`/project/${project.baseProject}/${project.branch}/settings`} style={{textDecoration: "none"}}>
                        <Text
                            size="2"
                            weight={isSettingsPage ? "bold" : "regular"}
                            style={{color: isSettingsPage ? "var(--blue-11)" : "var(--gray-11)"}}
                        >
                            Settings
                        </Text>
                    </Link>
                    */}
                </nav>

                <div style={{flex: 1}} />

                {/* Outlet context for header actions */}
                <div id="header-actions" style={{display: "flex", alignItems: "center", gap: "12px"}} />

                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <Avatar
                            size="2"
                            fallback={initials}
                            radius="full"
                            style={{cursor: "pointer"}}
                        />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                        <DropdownMenu.Item asChild>
                            <Link to="/profile">Profile</Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item asChild>
                            <Link to="/auth/logout" style={{color: "var(--red-11)"}}>
                                <ExitIcon /> Logout
                            </Link>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </header>

            {/* Main Content Area */}
            <div style={{flex: 1, display: "flex", overflow: "hidden"}}>
                {/* Icon Sidebar */}
                <aside style={{
                    width: "56px",
                    backgroundColor: "#fff",
                    borderRight: "1px solid var(--gray-6)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    flexShrink: 0
                }}>
                    <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
                        {iconSidebarItems.map((item) => (
                            <Tooltip key={item.id} content={item.tooltip}>
                                <button
                                    onClick={() => handleIconClick(item.id, item.path)}
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        border: "none",
                                        borderRadius: "8px",
                                        backgroundColor: activeItem === item.id ? "var(--blue-3)" : "transparent",
                                        color: activeItem === item.id ? "var(--blue-11)" : "var(--gray-11)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    {item.icon}
                                </button>
                            </Tooltip>
                        ))}
                    </div>

                    <div style={{flex: 1}} />

                    <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
                        {iconSidebarBottomItems.map((item) => (
                            <Tooltip key={item.id} content={item.tooltip}>
                                <button
                                    onClick={() => handleIconClick(item.id, item.path)}
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        border: "none",
                                        borderRadius: "8px",
                                        backgroundColor: activeItem === item.id ? "var(--blue-3)" : "transparent",
                                        color: activeItem === item.id ? "var(--blue-11)" : "var(--gray-11)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    {item.icon}
                                </button>
                            </Tooltip>
                        ))}
                    </div>
                </aside>

                {/* Content Area - rendered by child routes */}
                <Outlet context={{project}} />
            </div>
        </div>
    );
}

// Hook for child routes to access layout data
export function useProjectLayout() {
    return useLoaderData<typeof loader>();
}
