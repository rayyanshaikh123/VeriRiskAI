"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CameraCapture, type CapturedFrame } from "@/components/camera";
import { ChallengeCard } from "@/components/challenge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError, startVerification, submitFrame, submitVerification } from "@/lib/api";
import { DEFAULT_CAPTURE_DELAY_MS, MAX_FRAMES, MIN_FRAMES } from "@/lib/constants";
import { useBackoff } from "@/lib/hooks";
import {
  stripBase64Prefix,
  validateImageFile,
  validateImagePixels,
} from "@/lib/validators";
import { useSessionStore } from "@/store/session";
import type { SessionType } from "@/types/api";

const sessionOptions: { label: string; value: SessionType }[] = [
  { label: "Photo verification", value: "photo" },
  { label: "Video verification", value: "video" },
];

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const router = useRouter();
  const startAbortRef = useRef<AbortController | null>(null);
  const frameAbortRef = useRef<AbortController | null>(null);
  const submitAbortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const frameIndexRef = useRef(0);
  const backoff = useBackoff(DEFAULT_CAPTURE_DELAY_MS, 2000);

  const [userId, setUserId] = useState("");
  const [sessionType, setSessionType] = useState<SessionType>("photo");
  const [notice, setNotice] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idPayload, setIdPayload] = useState<string | null>(null);

  const {
    sessionId,
    challenges,
    frameCount,
    lastFrame,
    captureActive,
    captureDelayMs,
    setSession,
    setCaptureActive,
    setCaptureDelay,
    setLastFrame,
    incrementFrame,
    setError,
    clearError,
    error,
    resetSession,
    setSubmitResult,
  } = useSessionStore();

  useEffect(() => {
    return () => {
      startAbortRef.current?.abort();
      frameAbortRef.current?.abort();
      submitAbortRef.current?.abort();
      if (idPreview) {
        URL.revokeObjectURL(idPreview);
      }
    };
  }, [idPreview]);

  useEffect(() => {
    if (frameCount >= MAX_FRAMES) {
      setCaptureActive(false);
      setNotice("Maximum frame count reached.");
    }
  }, [frameCount, setCaptureActive]);

  const progress = useMemo(() => {
    const ratio = Math.min(frameCount / MAX_FRAMES, 1);
    return Math.round(ratio * 100);
  }, [frameCount]);

  const challenge = challenges[0] ?? null;
  const challengePassed = lastFrame?.challenge_passed ?? false;

  const isReadyToSubmit =
    challengePassed && frameCount >= MIN_FRAMES && Boolean(idPayload);

  const handleStartSession = async () => {
    if (!userId.trim()) {
      setLocalError("User ID is required to start capture.");
      return;
    }
    setLocalError(null);
    setNotice(null);
    setIsStarting(true);
    startAbortRef.current?.abort();
    const controller = new AbortController();
    startAbortRef.current = controller;
    resetSession();

    try {
      const data = await startVerification(
        {
          user_id: userId.trim(),
          session_type: sessionType,
        },
        { signal: controller.signal },
      );
      setSession(data.session_id, data.challenges);
      setCaptureDelay(DEFAULT_CAPTURE_DELAY_MS);
      setCaptureActive(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError({
          code: err.code,
          message: err.message,
          details: err.details,
          requestId: err.requestId,
        });
      } else {
        setError({
          code: "UNKNOWN",
          message: "Unable to start a session. Please try again.",
        });
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleFrame = useCallback(
    async (frame: CapturedFrame) => {
      if (!sessionId || inFlightRef.current || frameCount >= MAX_FRAMES) {
        return;
      }

      inFlightRef.current = true;
      frameAbortRef.current?.abort();
      const controller = new AbortController();
      frameAbortRef.current = controller;

      try {
        const response = await submitFrame(
          {
            session_id: sessionId,
            frame_b64: frame.base64,
            frame_index: frameIndexRef.current,
          },
          { signal: controller.signal },
        );
        frameIndexRef.current += 1;
        setLastFrame(response);
        incrementFrame();
        clearError();
        setNotice(null);
        backoff.reset();
        setCaptureDelay(DEFAULT_CAPTURE_DELAY_MS);
        if (response.challenge_passed) {
          setCaptureActive(false);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === "RATE_LIMITED") {
            const nextDelay = backoff.nextDelay();
            setCaptureDelay(nextDelay);
            setNotice("Rate limit hit. Slowing capture pace.");
            return;
          }
          if (err.code === "INVALID_FRAME") {
            setNotice("Frame rejected. Adjust lighting or framing.");
            return;
          }
          if (err.code === "SESSION_EXPIRED" || err.code === "SESSION_NOT_FOUND") {
            resetSession();
            setCaptureActive(false);
            setLocalError("Session expired. Start again.");
            return;
          }
          setError({
            code: err.code,
            message: err.message,
            details: err.details,
            requestId: err.requestId,
          });
        } else {
          setError({
            code: "UNKNOWN",
            message: "Unable to send frame. Please try again.",
          });
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [
      sessionId,
      frameCount,
      backoff,
      setCaptureDelay,
      setLastFrame,
      incrementFrame,
      clearError,
      setError,
      resetSession,
      setCaptureActive,
    ],
  );

  const handleIdChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selected = event.target.files?.[0] ?? null;
    setLocalError(null);
    setIdPayload(null);

    if (!selected) {
      setIdFile(null);
      if (idPreview) {
        URL.revokeObjectURL(idPreview);
        setIdPreview(null);
      }
      return;
    }

    const validation = validateImageFile(selected);
    if (!validation.ok) {
      setLocalError(validation.message ?? "Invalid image file");
      return;
    }

    try {
      const pixelCheck = await validateImagePixels(selected);
      if (!pixelCheck.ok) {
        setLocalError(pixelCheck.message ?? "Invalid image dimensions");
        return;
      }
    } catch (err) {
      setLocalError("Unable to validate image dimensions");
      return;
    }

    setIdFile(selected);
    if (idPreview) {
      URL.revokeObjectURL(idPreview);
    }
    setIdPreview(URL.createObjectURL(selected));

    const dataUrl = await fileToBase64(selected);
    setIdPayload(stripBase64Prefix(dataUrl));
  };

  const handleSubmit = async () => {
    if (!sessionId) {
      setLocalError("Start a session before submitting.");
      return;
    }
    if (!idPayload) {
      setLocalError("Upload an ID image to continue.");
      return;
    }
    if (!challengePassed || frameCount < MIN_FRAMES) {
      setLocalError("Complete the live challenge before submitting.");
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);
    submitAbortRef.current?.abort();
    const controller = new AbortController();
    submitAbortRef.current = controller;

    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `idempotency-${Date.now()}`;

    try {
      const response = await submitVerification(
        {
          session_id: sessionId,
          id_image_b64: idPayload,
        },
        { idempotencyKey, signal: controller.signal },
      );
      setSubmitResult(response);
      router.push("/processing");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "IDEMPOTENCY_CONFLICT") {
          setLocalError("Idempotency conflict. Retry submission.");
          return;
        }
        if (err.code === "INVALID_IMAGE") {
          setLocalError("The image was rejected. Choose another.");
          return;
        }
        if (err.code === "SESSION_EXPIRED" || err.code === "SESSION_NOT_FOUND") {
          resetSession();
          setCaptureActive(false);
          setLocalError("Session expired. Start again.");
          return;
        }
        setLocalError(err.message);
      } else {
        setLocalError("Unable to submit verification.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] antialiased">
      <header className="glass fixed top-0 z-50 w-full bg-white/80 shadow-sm shadow-slate-200/50">
        <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-6 md:px-8">
          <div className="text-lg font-black tracking-tighter text-slate-950">
            VeriRisk AI
          </div>
          <nav className="hidden items-center space-x-8 md:flex">
            <span className="border-b-2 border-slate-950 pb-1 font-semibold">
              Verification
            </span>
            <span className="text-slate-500">Documents</span>
            <span className="text-slate-500">Reports</span>
          </nav>
          <Link
            className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white"
            href="/results"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="px-6 pb-12 pt-24 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-12">
            <h1 className="mb-4 text-[3.5rem] font-bold leading-[1.1] tracking-tight text-black">
              Video Upload Step.
            </h1>
            <p className="max-w-xl text-lg text-[#45464d]">
              Upload your verification video to start analysis. After upload,
              processing will begin before results are shown.
            </p>
          </header>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-8">
              <div className="rounded-3xl bg-white p-6 shadow-soft">
                <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-[#45464d]">
                    User ID
                    <input
                      type="text"
                      value={userId}
                      onChange={(event) => setUserId(event.target.value)}
                      placeholder="e.g. user_12345"
                      className="mt-2 w-full rounded-2xl border border-[#d3e4fe] bg-white px-4 py-3 text-sm focus:border-black focus:outline-none"
                    />
                  </label>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#45464d]">
                      Session Type
                    </p>
                    <div className="grid gap-2">
                      {sessionOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSessionType(option.value)}
                          className={`rounded-2xl border px-4 py-2 text-left text-xs font-semibold transition ${
                            sessionType === option.value
                              ? "border-black bg-black text-white"
                              : "border-[#d3e4fe] bg-white text-[#57657b]"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-full bg-[#eff4ff] p-2">
                <div className="flex flex-1 items-center space-x-1 px-4">
                  <div className="h-2 w-full rounded-full bg-black"></div>
                  <div className="h-2 w-full rounded-full bg-[#bec6e0]"></div>
                  <div className="h-2 w-full rounded-full bg-[#bec6e0]"></div>
                </div>
                <span className="whitespace-nowrap border-l border-[#c6c6cd]/30 px-6 text-xs font-bold uppercase tracking-widest text-[#45464d]">
                  Step 01 / 03
                </span>
              </div>

              <div className="rounded-2xl bg-white px-6 py-4 text-sm text-[#45464d]">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span>Frames captured</span>
                  <span>{frameCount} / {MAX_FRAMES}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#d3e4fe]">
                  <div
                    className="h-full rounded-full bg-black"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="group relative flex flex-col items-center justify-center space-y-6 overflow-hidden rounded-[2rem] border-2 border-dashed border-[#bec6e0] bg-white p-12 text-center transition-all duration-300 hover:border-black">
                <CameraCapture
                  isActive={captureActive}
                  captureDelayMs={captureDelayMs}
                  canCapture={captureActive && !inFlightRef.current}
                  onFrame={handleFrame}
                  onError={(message) => setNotice(message)}
                  className="w-full"
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">
                    Live Capture Session
                  </h3>
                  <p className="mx-auto max-w-sm text-[#45464d]">
                    Center your face in the frame. We capture frames every {captureDelayMs}ms
                    until the challenge is complete.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    type="button"
                    onClick={handleStartSession}
                    disabled={isStarting}
                    className="rounded-xl bg-black px-8 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isStarting ? "Starting..." : "Start Capture"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaptureActive(!captureActive)}
                    className="rounded-xl bg-[#d3e4fe] px-8 py-3 font-bold text-[#57657b]"
                  >
                    {captureActive ? "Pause Capture" : "Resume Capture"}
                  </button>
                </div>
                <p className="mt-4 text-xs font-medium tracking-tight text-[#45464d]">
                  Min frames required: {MIN_FRAMES}. Max frames: {MAX_FRAMES}.
                </p>
              </div>

              {(notice || error || localError) && (
                <Alert variant={error ? "danger" : "warning"}>
                  <AlertTitle>{error ? error.code : "Capture Notice"}</AlertTitle>
                  <AlertDescription>
                    {localError || error?.message || notice}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between pt-2">
                <Link
                  className="flex items-center space-x-2 px-4 py-2 font-bold text-[#45464d] transition-colors hover:text-black"
                  href="/"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span>Back to Landing</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isReadyToSubmit || isSubmitting}
                  className={`group flex items-center space-x-4 rounded-xl px-8 py-4 text-lg font-bold transition ${
                    isReadyToSubmit
                      ? "bg-black text-white"
                      : "cursor-not-allowed bg-[#d3e4fe] text-[#57657b]"
                  }`}
                >
                  <span>
                    {isSubmitting ? "Submitting..." : "Continue to Processing"}
                  </span>
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-8 lg:col-span-4">
              <ChallengeCard challenge={challenge} passed={challengePassed} />

              <div className="rounded-[2rem] border border-white/40 bg-white p-6">
                <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-[#45464d]">
                  Upload ID Image
                </h4>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleIdChange}
                  className="w-full text-sm"
                />
                {idPreview && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-[#d3e4fe]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={idPreview}
                      alt="ID preview"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-white/40 bg-[#dce9ff]/50 p-8">
                <h4 className="mb-6 flex items-center text-lg font-black">
                  <span className="material-symbols-outlined mr-2 text-black">
                    verified_user
                  </span>
                  Quality Guidelines
                </h4>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6ffbbe]">
                      <span className="material-symbols-outlined text-sm text-[#005236]">
                        light_mode
                      </span>
                    </div>
                    <div>
                      <h5 className="mb-1 text-sm font-bold">
                        Avoid Direct Glare
                      </h5>
                      <p className="text-xs leading-relaxed text-[#45464d]">
                        Ensure lighting is uniform. Reflections on laminated
                        surfaces can obscure data points.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6ffbbe]">
                      <span className="material-symbols-outlined text-sm text-[#005236]">
                        crop_free
                      </span>
                    </div>
                    <div>
                      <h5 className="mb-1 text-sm font-bold">
                        Capture All Corners
                      </h5>
                      <p className="text-xs leading-relaxed text-[#45464d]">
                        The entire document must be visible within the frame to
                        confirm physical authenticity.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6ffbbe]">
                      <span className="material-symbols-outlined text-sm text-[#005236]">
                        visibility
                      </span>
                    </div>
                    <div>
                      <h5 className="mb-1 text-sm font-bold">High Resolution</h5>
                      <p className="text-xs leading-relaxed text-[#45464d]">
                        Text must be sharp and legible. Avoid blurry captures or
                        low-light conditions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 rounded-full border border-[#c6c6cd]/20 bg-[#eff4ff] p-6">
                <span
                  className="material-symbols-outlined text-3xl text-[#bec6e0]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shield_lock
                </span>
                <div>
                  <p className="text-xs font-bold">End-to-End Encryption</p>
                  <p className="text-[10px] text-[#45464d]">
                    AES-256 Bit Security Protocols
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
