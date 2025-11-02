import { createCookieSessionStorage } from "react-router";

type SessionData = {
    token: string;
};

type SessionFlashData = {
    //error: string;
};

const { getSession: _getSession, commitSession, destroySession } =
    createCookieSessionStorage<SessionData, SessionFlashData>(
        {
            cookie: {
                name: "__session",
                httpOnly: true,
                maxAge: 60*60*24,
                path: "/",
                sameSite: "strict",
                secrets: process.env.COOKIE_SECRET?.split(";") || [],
                secure: process.env.SECURE_COOKIE !== "false",
            },
        },
    );

const getSession = async (request: Request) => {
  return _getSession(request.headers.get("Cookie"));
}

export { getSession, commitSession, destroySession };
