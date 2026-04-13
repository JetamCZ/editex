import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),

    route("auth/login", "routes/login.tsx"),
    route("auth/register", "routes/register.tsx"),
    route("auth/logout", "routes/logout.tsx"),
    route("auth/verify-email", "routes/verify-email.tsx"),
    route("auth/forgot-password", "routes/forgot-password.tsx"),
    route("auth/reset-password", "routes/reset-password.tsx"),

    // Auth layout wraps all protected routes
    layout("routes/api/auth-user.tsx", {id: "auth-user"}, [
        route("dashboard", "routes/dashboard.tsx", {id: "dashboard"}, [
            index("routes/dashboard.index.tsx"),
            route("new", "routes/dashboard.new.tsx"),
        ]),

        route("project/:baseProject/:branch?", "routes/editor/layout.tsx", {id: "project-layout"}, [
            index("routes/editor/index.tsx"),
            route("file/:fileId", "routes/editor/index.tsx", {id: "project-file"}),
            route("settings", "routes/editor/settings.tsx", {id: "project-settings"}),
            route("settings/permissions", "routes/editor/settings-permissions.tsx", {id: "project-settings-permissions"}),
            route("help", "routes/editor/help.tsx", {id: "project-help"}),
            route("versions", "routes/editor/versions.tsx", {id: "project-versions"}),
        ]),

        route("profile", "routes/profile.tsx"),
    ])
] satisfies RouteConfig;
