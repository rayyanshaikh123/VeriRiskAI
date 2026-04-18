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
  submitResult?: VerifyUploadResponse;
  status: SessionStatus;
  error?: SessionError;
  setUserInput: (userId: string, inputType: InputType) => void;
  setStatus: (status: SessionStatus) => void;
  setError: (error: SessionError) => void;
  clearError: () => void;
  setSubmitResult: (result: VerifyUploadResponse) => void;
  resetSession: () => void;
}

const initialState = {
  userId: undefined,
  inputType: "image" as InputType,
  submitResult: undefined,
  status: "idle" as SessionStatus,
  error: undefined,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  setUserInput: (userId, inputType) =>
    set({ userId, inputType, status: "ready", error: undefined }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: "error" }),
  clearError: () => set({ error: undefined, status: "ready" }),
  setSubmitResult: (result) => set({ submitResult: result, status: "ready" }),
  resetSession: () => set({ ...initialState }),
}));
