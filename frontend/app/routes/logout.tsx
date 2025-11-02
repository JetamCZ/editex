import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { destroySession, getSession } from "~/lib/sessions.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  return redirect("/auth/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

export default function Logout() {
  return null;
}
