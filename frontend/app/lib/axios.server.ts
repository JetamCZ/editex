import axios from 'axios';
import {getSession} from "~/lib/sessions.server";

// Create an axios instance with token from request cookies
export async function getApiClient(request: Request) {
  const session = await getSession(request);
  const token = session.get("token")

  return axios.create({
    baseURL: process.env.BACKEND_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
}

// Default export for backward compatibility (without auth)
const api = axios.create({
  baseURL: process.env.BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
