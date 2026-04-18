export type InputType = "image" | "video";
export type Verdict = "ACCEPT" | "REVIEW" | "REJECT";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_IMAGE"
  | "INVALID_VIDEO"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"
  | "IDEMPOTENCY_CONFLICT";

export interface ResponseMeta {
  request_id: string;
  timestamp: string;
}

export interface ErrorResponse {
  error_code: ErrorCode;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface ResponseEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ErrorResponse | null;
  meta: ResponseMeta;
}

export interface SignalBreakdown {
  spatial_fake_score: number;
  frequency_fake_score: number;
  temporal_score?: number | null;
}

export interface SignalFlags {
  artifact_flag: boolean;
  frequency_anomaly: boolean;
  temporal_inconsistency: boolean;
  watermark_detected: boolean;
}

export interface VerifyUploadRequest {
  user_id: string;
  input_type: InputType;
  file: string;
}

export interface VerifyUploadResponse {
  verdict: Verdict;
  confidence: number;
  signals: SignalBreakdown;
  flags: SignalFlags;
}
