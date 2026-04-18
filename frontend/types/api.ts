export type SessionType = "photo" | "video";
export type ChallengeType = "blink" | "head_turn" | "smile" | "number";
export type Verdict = "ACCEPT" | "REVIEW" | "REJECT";
export type SessionState =
  | "CREATED"
  | "IN_PROGRESS"
  | "CHALLENGE_PASSED"
  | "SUBMITTED"
  | "COMPLETED"
  | "EXPIRED";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "INVALID_FRAME"
  | "INVALID_IMAGE"
  | "RATE_LIMITED"
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

export interface ChallengePrompt {
  type: ChallengeType;
  value: string | number;
  expires_at: string;
}

export interface SignalBreakdown {
  face_match_score: number;
  liveness_score: number;
  spatial_fake_score: number;
  frequency_fake_score: number;
  temporal_score?: number | null;
  clip_score: number;
  behavioral_score: number;
  challenge_score: number;
}

export interface HeatmapArtifact {
  url: string;
  expires_at: string;
  mime_type: string;
}

export interface VerifyStartRequest {
  user_id: string;
  session_type: SessionType;
}

export interface VerifyStartResponse {
  session_id: string;
  challenges: ChallengePrompt[];
}

export interface VerifyFrameRequest {
  session_id: string;
  frame_b64: string;
  frame_index: number;
}

export interface VerifyFrameResponse {
  liveness_score: number;
  face_detected: boolean;
  challenge_passed: boolean;
}

export interface VerifySubmitRequest {
  session_id: string;
  id_image_b64: string;
}

export interface VerifySubmitResponse {
  verdict: Verdict;
  confidence: number;
  heatmap?: HeatmapArtifact | null;
  signals: SignalBreakdown;
  session_id: string;
}
