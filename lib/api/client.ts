"use client";

import { appConfig } from "@/lib/config";
import { ApiError, type ApiErrorPayload } from "@/lib/api/errors";
import { serializeQuery, type QueryParams } from "@/lib/api/query";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  rawResponse?: boolean;
  skipAuth?: boolean;
}

async function buildHeaders(custom?: Record<string, string>): Promise<Headers> {
  const headers = new Headers(custom);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  return headers;
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload = { status: response.status };
  try {
    const text = await response.text();
    if (text) {
      const json = JSON.parse(text) as ApiErrorPayload;
      payload = { ...payload, ...json };
    }
  } catch {
    /* ignore non-JSON bodies */
  }
  const message =
    payload.detail ??
    payload.title ??
    payload.message ??
    `Request failed with status ${response.status}`;
  return new ApiError(message, response.status, payload);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, headers, signal, rawResponse, skipAuth } = options;
  const base = skipAuth ? "" : appConfig.apiBaseUrl;
  const url = `${base}${path}${serializeQuery(query)}`;

  const finalHeaders = await buildHeaders(headers);
  let payload: BodyInit | null | undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      payload = body;
    } else {
      finalHeaders.set("Content-Type", "application/json");
      payload = JSON.stringify(body);
    }
  }

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: payload,
    signal,
    credentials: "include",
  });

  if (response.status === 401 && !skipAuth && typeof window !== "undefined") {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`${appConfig.oidc.loginPath}?returnTo=${returnTo}`);
    throw await parseError(response);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (rawResponse) return response as unknown as T;
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
