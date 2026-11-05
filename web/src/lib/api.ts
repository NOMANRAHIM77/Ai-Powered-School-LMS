import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
const refreshClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api", withCredentials: true });
let refreshPromise: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  // Let the browser supply the multipart boundary, including when retrying an upload.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) config.headers.delete('Content-Type');
  if (typeof window !== "undefined") {
    const accessToken = window.localStorage.getItem("educore-access-token");
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && typeof window !== "undefined" && original && !original._retried && !String(original.url).startsWith("/auth/")) {
      original._retried = true;
      try {
        refreshPromise ??= refreshClient.post("/auth/refresh-token").then((response) => response.data.data.accessToken as string).finally(() => { refreshPromise = null; });
        const token = await refreshPromise;
        window.localStorage.setItem("educore-access-token", token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        window.localStorage.removeItem("educore-access-token");
      }
    }
    return Promise.reject(error);
  },
);
