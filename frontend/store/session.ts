import { create } from "zustand";

import type { ErrorCode, InputType, VerifyUploadResponse } from "@/types/api";

export type SessionError = {
  code: ErrorCode | "UNKNOWN";
  message: string;
  details?: Record<string, unknown> | null;
  requestId?: string;
};

export type SessionStatus = "idle" | "loading" | "ready" | "error";

interface SessionState {
  userId?: string;
  inputType: InputType;
  previewUrl?: string;
  previewDataUrl?: string;
  submitResult?: VerifyUploadResponse;
  status: SessionStatus;
  error?: SessionError;
  setUserInput: (userId: string, inputType: InputType) => void;
  setPreviewUrl: (previewUrl?: string) => void;
  setPreviewDataUrl: (previewDataUrl?: string) => void;
  setStatus: (status: SessionStatus) => void;
  setError: (error: SessionError) => void;
  clearError: () => void;
  setSubmitResult: (result: VerifyUploadResponse) => void;
  resetSession: () => void;
}

const initialState = {
  userId: undefined,
  inputType: "image" as InputType,
  previewUrl: undefined,
  previewDataUrl: undefined,
  submitResult: undefined,
  status: "idle" as SessionStatus,
  error: undefined,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  setUserInput: (userId, inputType) =>
    set({ userId, inputType, status: "ready", error: undefined }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setPreviewDataUrl: (previewDataUrl) => set({ previewDataUrl }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: "error" }),
  clearError: () => set({ error: undefined, status: "ready" }),
  setSubmitResult: (result) => set({ submitResult: result, status: "ready" }),
  resetSession: () => set({ ...initialState }),
}));
