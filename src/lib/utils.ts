import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Optional base path (e.g. "/dev"); leave empty for root deployments */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

/** App origin for absolute URLs when you really need them (SSR, Node, etc.) */
export const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

/** Build an API path, honoring BASE_PATH (client-friendly, relative URL) */
export function apiPath(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}

/** Build an absolute API URL, when you truly need a full origin */
export function absoluteApiUrl(path: string) {
  const rel = apiPath(path);
  return APP_ORIGIN ? `${APP_ORIGIN}${rel}` : rel; // falls back to relative if origin not set
}