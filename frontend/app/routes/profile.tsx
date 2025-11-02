import {useLoaderData, useRouteLoaderData} from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getApiClient } from "../lib/axios.server";
import AppLayout from "../components/AppLayout";
import type {User} from "../../types/user";

export async function loader({ request }: LoaderFunctionArgs) {
    const api = await getApiClient(request);

    return { };
}

const Profile = () => {
    const {user} = useRouteLoaderData("auth-user") as {user: User}

    return (
        <AppLayout>
            {JSON.stringify(user, null, 2)}
        </AppLayout>
    );
};

export default Profile;
