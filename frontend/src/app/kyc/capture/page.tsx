"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CameraCapture, type CapturedFrame } from "@/components/camera";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError, submitFrame } from "@/lib/api";
import { useBackoff } from "@/lib/hooks";
import { DEFAULT_CAPTURE_DELAY_MS, MAX_FRAMES } from "@/lib/constants";
import { useSessionStore } from "@/store/session";

export default function KycCapturePage() {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const frameIndexRef = useRef(0);
  const backoff = useBackoff(DEFAULT_CAPTURE_DELAY_MS, 2000);
  const [notice, setNotice] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(false);

  const {
    sessionId,
    frameCount,
    lastFrame,
    captureActive,
    captureDelayMs,
    setCaptureActive,
    setCaptureDelay,
    setLastFrame,
    incrementFrame,
    setError,
    clearError,
    error,
    resetSession,
  } = useSessionStore();

  useEffect(() => {
    if (!sessionId) {
      router.replace("/kyc/start");
    }
  }, [router, sessionId]);

  useEffect(() => {
    setCaptureActive(true);
    return () => {
      setCaptureActive(false);
      abortRef.current?.abort();
    };
  }, [setCaptureActive]);

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

  const handleFrame = useCallback(
    async (frame: CapturedFrame) => {
      if (!sessionId || inFlightRef.current || frameCount >= MAX_FRAMES) {
        return;
      }

      inFlightRef.current = true;
      setInFlight(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

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
          router.push("/kyc/challenge");
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
            router.replace("/kyc/start");
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
        setInFlight(false);
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
      router,
      setCaptureActive,
    ],
  );

  const canCapture = captureActive && !inFlight;
  const livenessScore = lastFrame?.liveness_score ?? 0;
  const challengePassed = lastFrame?.challenge_passed ?? false;

  return (
    <main className="processing-background min-h-screen px-6 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#45464d]">
              Step 2
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0b1c30]">
              Capture live frames
            </h1>
            <p className="mt-2 text-sm text-[#45464d]">
              Keep your face centered and follow the prompt. We sample frames
              every {captureDelayMs}ms.
            </p>
          </div>

          <CameraCapture
            isActive={captureActive}
            captureDelayMs={captureDelayMs}
            canCapture={canCapture}
            onFrame={handleFrame}
            onError={(message) => setNotice(message)}
            className="w-full"
          />

          {(notice || error) && (
            <Alert variant={error ? "danger" : "warning"}>
              <AlertTitle>{error ? error.code : "Capture Notice"}</AlertTitle>
              <AlertDescription>{error ? error.message : notice}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-bold">Session progress</h2>
            <div className="mt-4 space-y-4 text-sm text-[#45464d]">
              <div>
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
              <div className="flex items-center justify-between">
                <span>Liveness score</span>
                <span className="font-semibold text-black">
                  {Math.round(livenessScore * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Challenge status</span>
                <span className={challengePassed ? "font-semibold text-[#2f9a6b]" : "font-semibold text-[#b06a00]"}>
                  {challengePassed ? "Passed" : "Pending"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-[#eff4ff] p-6">
            <p className="text-xs font-black uppercase tracking-widest text-[#45464d]">
              Tips
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#45464d]">
              <li>Ensure strong lighting and keep your face inside the frame.</li>
              <li>Avoid rapid movements or extreme angles.</li>
              <li>Wait for the challenge to pass before moving on.</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/kyc/challenge")}
              className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white"
            >
              Review Challenge
            </button>
            <Link
              href="/kyc/start"
              className="rounded-xl bg-[#d3e4fe] px-6 py-3 text-sm font-bold text-[#57657b]"
            >
              Restart
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
