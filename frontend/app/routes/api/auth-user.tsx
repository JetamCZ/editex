import type {LoaderFunctionArgs} from "react-router";
import {Outlet} from "react-router";
import {getApiClient} from "~/lib/axios.server";
import {getSession} from "~/lib/sessions.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const api = await getApiClient(request);
    const { data: user } = await api.get("/auth/me");

    const session = await getSession(request);
    const bearerToken = session.get("token")

    return { user, bearerToken };
}

export default function AuthLayout() {
    return <Outlet />;
}
