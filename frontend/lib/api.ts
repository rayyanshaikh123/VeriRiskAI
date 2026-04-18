import type {
  ErrorCode,
  ResponseEnvelope,
  VerifyFrameRequest,
  VerifyFrameResponse,
  VerifyStartRequest,
  VerifyStartResponse,
  VerifySubmitRequest,
  VerifySubmitResponse,
} from "@/types/api";

type RequestOptions = {
  signal?: AbortSignal;
  token?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
};

type SubmitOptions = RequestOptions & {
  idempotencyKey: string;
};

export class ApiError extends Error {
  status: number;
  code: ErrorCode | "UNKNOWN";
  details?: Record<string, unknown> | null;
  requestId?: string;

  constructor(
    message: string,
    status: number,
    code: ErrorCode | "UNKNOWN",
    details?: Record<string, unknown> | null,
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

const DEFAULT_BASE_URL = "";

function resolveBaseUrl(explicit?: string): string {
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  return DEFAULT_BASE_URL;
}

function buildHeaders(options?: RequestOptions): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options?.headers ?? {}),
  });

  const token = options?.token || process.env.NEXT_PUBLIC_AUTH_TOKEN;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function parseEnvelope<T>(
  response: Response,
): Promise<ResponseEnvelope<T>> {
  let payload: ResponseEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ResponseEnvelope<T>;
  } catch (error) {
    throw new ApiError(
      "Unexpected response from server",
      response.status,
      "UNKNOWN",
      undefined,
      undefined,
    );
  }

  if (!payload || typeof payload.success !== "boolean") {
    throw new ApiError(
      "Malformed response envelope",
      response.status,
      "UNKNOWN",
      undefined,
      undefined,
    );
  }

  if (!payload.success) {
    const errorCode = payload.error?.error_code ?? "UNKNOWN";
    const message = payload.error?.message ?? "Request failed";
    const details = payload.error?.details ?? null;
    const requestId = payload.meta?.request_id;
    throw new ApiError(message, response.status, errorCode, details, requestId);
  }

  return payload;
}

async function request<T>(
  path: string,
  init: RequestInit,
  options?: RequestOptions,
): Promise<ResponseEnvelope<T>> {
  const baseUrl = resolveBaseUrl(options?.baseUrl);
  const headers = buildHeaders(options);
  if (init.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    signal: options?.signal,
  });

  return parseEnvelope<T>(response);
}

export async function startVerification(
  payload: VerifyStartRequest,
  options?: RequestOptions,
): Promise<VerifyStartResponse> {
  const envelope = await request<VerifyStartResponse>(
    "/v1/verify/start",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    options,
  );
  if (!envelope.data) {
    throw new ApiError("Missing data in response", 200, "UNKNOWN");
  }
  return envelope.data;
}

export async function submitFrame(
  payload: VerifyFrameRequest,
  options?: RequestOptions,
): Promise<VerifyFrameResponse> {
  const envelope = await request<VerifyFrameResponse>(
    "/v1/verify/frame",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    options,
  );
  if (!envelope.data) {
    throw new ApiError("Missing data in response", 200, "UNKNOWN");
  }
  return envelope.data;
}

export async function submitVerification(
  payload: VerifySubmitRequest,
  options: SubmitOptions,
): Promise<VerifySubmitResponse> {
  const headers = buildHeaders(options);
  headers.set("Idempotency-Key", options.idempotencyKey);

  const envelope = await request<VerifySubmitResponse>(
    "/v1/verify/submit",
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers,
    },
    options,
  );
  if (!envelope.data) {
    throw new ApiError("Missing data in response", 200, "UNKNOWN");
  }
  return envelope.data;
}
