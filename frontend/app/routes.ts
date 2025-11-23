import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),

    route("auth/login", "routes/login.tsx"),
    route("auth/register", "routes/register.tsx"),
    route("auth/logout", "routes/logout.tsx"),

    // Auth layout wraps all protected routes
    layout("routes/api/auth-user.tsx", {id: "auth-user"}, [
        route("dashboard", "routes/dashboard.tsx", {id: "dashboard"}, [
            index("routes/dashboard.index.tsx"),
            route("new", "routes/dashboard.new.tsx"),
        ]),
        route("editor", "routes/editor.tsx"),
        route("profile", "routes/profile.tsx"),
    ])
] satisfies RouteConfig;
