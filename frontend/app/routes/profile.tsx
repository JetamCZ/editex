import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getApiClient } from "../lib/axios.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const api = await getApiClient(request);
    const { data: user } = await api.get("/auth/me");
    return user;
}

const Profile = () => {
    const data = useLoaderData<typeof loader>();

    return (
        <div style={{ padding: "20px" }}>
            <h1>Profile</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
};

export default Profile;
