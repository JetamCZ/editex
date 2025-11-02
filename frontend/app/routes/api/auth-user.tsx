import type {LoaderFunctionArgs} from "react-router";
import {Outlet} from "react-router";
import {getApiClient} from "~/lib/axios.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const api = await getApiClient(request);
    const { data: user } = await api.get("/auth/me");
    return { user };
}

export default function AuthLayout() {
    return <Outlet />;
}
