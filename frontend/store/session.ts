import { create } from "zustand";

import type {
  ChallengePrompt,
  ErrorCode,
  VerifyFrameResponse,
  VerifySubmitResponse,
} from "@/types/api";

export type SessionError = {
  code: ErrorCode | "UNKNOWN";
  message: string;
  details?: Record<string, unknown> | null;
  requestId?: string;
};

export type SessionStatus = "idle" | "loading" | "ready" | "error";

interface SessionState {
  sessionId?: string;
  challenges: ChallengePrompt[];
  frameCount: number;
  lastFrame?: VerifyFrameResponse;
  submitResult?: VerifySubmitResponse;
  status: SessionStatus;
  error?: SessionError;
  captureActive: boolean;
  captureDelayMs: number;
  setSession: (sessionId: string, challenges: ChallengePrompt[]) => void;
  setStatus: (status: SessionStatus) => void;
  setError: (error: SessionError) => void;
  clearError: () => void;
  setLastFrame: (frame: VerifyFrameResponse) => void;
  incrementFrame: () => void;
  setSubmitResult: (result: VerifySubmitResponse) => void;
  resetSession: () => void;
  setCaptureActive: (active: boolean) => void;
  setCaptureDelay: (delayMs: number) => void;
}

const initialState = {
  sessionId: undefined,
  challenges: [] as ChallengePrompt[],
  frameCount: 0,
  lastFrame: undefined,
  submitResult: undefined,
  status: "idle" as SessionStatus,
  error: undefined,
  captureActive: false,
  captureDelayMs: 400,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  setSession: (sessionId, challenges) =>
    set({ sessionId, challenges, status: "ready", error: undefined }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: "error" }),
  clearError: () => set({ error: undefined, status: "ready" }),
  setLastFrame: (frame) => set({ lastFrame: frame }),
  incrementFrame: () => set((state) => ({ frameCount: state.frameCount + 1 })),
  setSubmitResult: (result) => set({ submitResult: result, status: "ready" }),
  resetSession: () => set({ ...initialState }),
  setCaptureActive: (active) => set({ captureActive: active }),
  setCaptureDelay: (delayMs) => set({ captureDelayMs: delayMs }),
}));
