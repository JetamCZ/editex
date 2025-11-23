import {useRouteLoaderData} from "react-router";
import type {User} from "../../types/user";

const useAuth = () => {
    return  useRouteLoaderData("auth-user") as { user: User, bearerToken: string }
}

export default useAuth;
