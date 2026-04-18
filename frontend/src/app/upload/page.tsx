"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ClickSpark from "@/components/ClickSpark";
import MagicBento from "@/components/MagicBento";
import { ApiError, uploadVerification } from "@/lib/api";
import {
  stripBase64Prefix,
  validateImageFile,
  validateImagePixels,
  validateVideoFile,
} from "@/lib/validators";
import { useSessionStore } from "@/store/session";
import type { InputType } from "@/types/api";

const inputOptions: { label: string; value: InputType }[] = [
  { label: "Selfie image", value: "image" },
  { label: "Short video", value: "video" },
];

const demoUsers = ["demo_olivia", "demo_raj", "demo_maria"];

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

function formatBytes(bytes: number): string {
  if (!bytes) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
}

export default function UploadPage() {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [userId, setUserId] = useState("");
  const [inputType, setInputType] = useState<InputType>("image");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { setUserInput, setSubmitResult, setError, clearError, error, resetSession } =
    useSessionStore();

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fileMeta = useMemo(() => {
    if (!file) {
      return null;
    }
    return {
      name: file.name,
      size: formatBytes(file.size),
    };
  }, [file]);

  const statusItems = useMemo(() => {
    if (!file) {
      return [
        { label: "Face detected", state: "waiting" },
        { label: "Lighting quality", state: "waiting" },
        { label: "Image resolution", state: "waiting" },
        { label: "No filters detected", state: "waiting" },
      ] as const;
    }

    return [
      { label: "Face detected", state: "ok" },
      { label: "Lighting quality", state: "warn" },
      { label: "Image resolution", state: "ok" },
      { label: "No filters detected", state: "ok" },
    ] as const;
  }, [file]);

  const progressValue = useMemo(() => {
    if (!file) {
      return 0;
    }
    const total = statusItems.length;
    const score = statusItems.reduce((acc, item) => {
      if (item.state === "ok") {
        return acc + 1;
      }
      if (item.state === "warn") {
        return acc + 0.5;
      }
      return acc;
    }, 0);
    return Math.round((score / total) * 100);
  }, [file, statusItems]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setLocalError(null);

    if (!selected) {
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    if (inputType === "image") {
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
      } catch {
        setLocalError("Unable to validate image dimensions");
        return;
      }
    } else {
      const validation = validateVideoFile(selected);
      if (!validation.ok) {
        setLocalError(validation.message ?? "Invalid video file");
        return;
      }
    }

    setFile(selected);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (inputType === "image") {
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveUpload = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!userId.trim()) {
      setLocalError("User ID is required");
      return;
    }
    if (!file) {
      setLocalError("Please choose a file to upload");
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);
    clearError();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    resetSession();

    try {
      const dataUrl = await fileToBase64(file);
      const base64 = stripBase64Prefix(dataUrl);
      const response = await uploadVerification(
        {
          user_id: userId.trim(),
          input_type: inputType,
          file: base64,
        },
        { signal: controller.signal },
      );
      setUserInput(userId.trim(), inputType);
      setSubmitResult(response);
      router.push("/processing");
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
          message: "Unable to process the upload. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClickSpark sparkColor="#e2e8f0" sparkSize={12} sparkRadius={18} sparkCount={10}>
      <div className="page-background min-h-screen antialiased">
        <header className="fixed top-0 z-50 w-full">
          <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-center px-6 md:px-8">
            <nav className="master-pill-nav" aria-label="Primary navigation">
              <Link className="master-pill-item" href="/">
                Home
              </Link>
              <Link className="master-pill-item" href="/#quick-start">
                Quick Start
              </Link>
              <Link className="master-pill-item is-active" href="/upload">
                Upload
              </Link>
            </nav>
          </div>
        </header>

        <main className="px-6 pb-16 pt-28 text-[15px] md:px-8">
          <div className="mx-auto max-w-6xl">
          <header className="mb-12 text-center">
            <h1 className="mb-3 text-3xl font-semibold leading-tight tracking-tight text-primary md:text-5xl">
              Submit Verification Media
            </h1>
            <p className="mx-auto max-w-xl text-base text-muted md:text-lg">
              Upload a selfie image or short video to initiate AI-based deepfake detection and
              authenticity analysis.
            </p>
          </header>

          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:justify-center">
            <div className="space-y-8">
              <div className="grid gap-8">
                <div className="space-y-8">
                  <MagicBento
                    enableSpotlight={false}
                    enableStars={false}
                    enableTilt={false}
                    enableMagnetism={false}
                    clickEffect={false}
                    textAutoHide={false}
                    enableBorderGlow
                    gridClassName="space-y-6 bento-section"
                    cardClassName="magic-bento-card--free"
                  >
                    <div className="surface-card p-7">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        User ID
                        <input
                          type="text"
                          value={userId}
                          onChange={(event) => setUserId(event.target.value)}
                          placeholder="e.g. user_12345"
                          className="mt-2 w-full rounded-lg border border-muted bg-[var(--surface)] px-4 py-3 text-sm text-primary focus:border-[var(--text)] focus:outline-none"
                        />
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                          <span className="text-muted">Demo:</span>
                          {demoUsers.map((demo) => (
                            <button
                              key={demo}
                              type="button"
                              onClick={() => setUserId(demo)}
                              className="rounded-full border border-muted bg-[var(--surface)] px-3 py-1 text-primary transition hover:border-[var(--text)]"
                            >
                              {demo}
                            </button>
                          ))}
                        </div>
                      </label>
                    </div>

                    <div className="surface-card border border-[rgba(226,232,240,0.6)] bg-white/90 p-7 shadow-soft">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#57657b]">
                        Input type
                      </p>
                      <p className="mt-2 text-sm text-[#57657b]">
                        Choose the primary input to guide the verification pipeline.
                      </p>
                      <div className="mt-5 grid gap-3">
                        {inputOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setInputType(option.value);
                              setFile(null);
                              if (previewUrl) {
                                URL.revokeObjectURL(previewUrl);
                                setPreviewUrl(null);
                              }
                            }}
                            className={`group flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9dc1ff]/60 ${
                              inputType === option.value
                                ? "border-white bg-white text-[#0b1c30] shadow-soft"
                                : "border-[#1c2d4a] bg-[#0f1c33] text-[#e2e8f0] hover:border-[#9dc1ff]"
                            }`}
                          >
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </MagicBento>
                </div>

                <div className="space-y-6">
                  <MagicBento
                    enableSpotlight={false}
                    enableStars={false}
                    enableTilt={false}
                    enableMagnetism={false}
                    clickEffect={false}
                    textAutoHide={false}
                    enableBorderGlow
                    gridClassName="bento-section"
                    cardClassName="magic-bento-card--free"
                  >
                    <div className="surface-card mx-auto w-full max-w-[560px] p-7">
                    <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                      Upload media
                    </h4>
                    <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-muted bg-[var(--surface)] px-8 py-10 text-center text-sm text-muted transition hover:border-[var(--text)]">
                      <span className="text-base font-semibold text-primary">
                        Choose {inputType === "image" ? "a selfie image" : "a short video"}
                      </span>
                      <span className="text-xs text-muted">
                        {inputType === "image"
                          ? "JPEG/PNG up to 2MB."
                          : "MP4/WEBM/QuickTime up to 15MB."}
                      </span>
                      <input
                        type="file"
                        accept={
                          inputType === "image"
                            ? "image/jpeg,image/png"
                            : "video/mp4,video/webm,video/quicktime"
                        }
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>

                    {file && (
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleRemoveUpload}
                          className="rounded-full border border-muted bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-muted transition hover:border-[var(--text)]"
                        >
                          Remove {inputType === "image" ? "pic" : "video"}
                        </button>
                      </div>
                    )}

                    {previewUrl && (
                      <div className="mt-4 rounded-lg border border-muted bg-[var(--surface)] p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Selfie preview"
                          className="max-h-72 w-full object-contain"
                        />
                      </div>
                    )}

                    {fileMeta && !previewUrl && (
                      <div className="mt-4 rounded-lg border border-dashed border-muted p-4 text-sm text-muted">
                        <div className="font-semibold text-primary">{fileMeta.name}</div>
                        <div className="text-xs text-muted">{fileMeta.size}</div>
                      </div>
                    )}
                    </div>
                  </MagicBento>
                </div>
              </div>

              {(localError || error) && (
                <Alert variant="danger">
                  <AlertTitle>{error ? error.code : "Upload error"}</AlertTitle>
                  <AlertDescription>{error ? error.message : localError}</AlertDescription>
                </Alert>
              )}

              <div className="mx-auto flex max-w-[560px] flex-col-reverse items-center gap-4 pt-2 sm:flex-row sm:justify-between">
                <Link
                  className="btn-secondary w-full px-5 py-2 text-sm sm:w-auto"
                  href="/"
                >
                  Back to Landing
                </Link>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`btn-primary group w-full px-8 py-4 text-base sm:w-auto ${
                    isSubmitting
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  <span>{isSubmitting ? "Uploading..." : "Continue to Processing"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-8">
              <MagicBento
                enableSpotlight={false}
                enableStars={false}
                enableTilt={false}
                enableMagnetism={false}
                clickEffect={false}
                textAutoHide={false}
                enableBorderGlow
                gridClassName="space-y-8 bento-section"
                cardClassName="magic-bento-card--free"
              >
                <div className="surface-card p-6">
                  <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    Upload checklist
                  </h4>
                  <ul className="space-y-3 text-xs text-muted">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#4edea3]"></span>
                      <span>Single selfie image or short video only.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#4edea3]"></span>
                      <span>JPEG/PNG for images, MP4/WEBM for video.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#4edea3]"></span>
                      <span>Even lighting, steady camera, avoid motion blur.</span>
                    </li>
                  </ul>
                </div>

                <div className="surface-card p-7">
                  <h4 className="mb-4 flex items-center text-base font-semibold text-primary">
                    <span className="material-symbols-outlined mr-2 text-lg text-muted">
                      verified_user
                    </span>
                    Media Verification Guidelines
                  </h4>
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)]">
                        <span className="material-symbols-outlined text-sm text-muted">
                          light_mode
                        </span>
                      </div>
                      <div>
                        <h5 className="mb-1 text-sm font-semibold text-primary">Avoid Direct Glare</h5>
                        <p className="text-xs leading-relaxed text-muted">
                          Ensure lighting is uniform and your face is fully visible.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)]">
                        <span className="material-symbols-outlined text-sm text-muted">
                          crop
                        </span>
                      </div>
                      <div>
                        <h5 className="mb-1 text-sm font-semibold text-primary">Keep In Frame</h5>
                        <p className="text-xs leading-relaxed text-muted">
                          Avoid cropped foreheads or chins for best detection quality.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)]">
                        <span className="material-symbols-outlined text-sm text-muted">
                          visibility
                        </span>
                      </div>
                      <div>
                        <h5 className="mb-1 text-sm font-semibold text-primary">Readable Detail</h5>
                        <p className="text-xs leading-relaxed text-muted">
                          Higher resolution improves frequency and artifact analysis.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                      Verification Status
                    </h4>
                    <span className="text-[11px] font-semibold text-muted">
                      {file ? "Live" : "Waiting for upload"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>Progress</span>
                      <span>{progressValue}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                      <div
                        className="h-full rounded-full bg-[#4edea3] transition-all duration-500"
                        style={{ width: `${progressValue}%` }}
                      />
                    </div>
                  </div>
                  <ul className="mt-4 space-y-3 text-xs text-muted">
                    {statusItems.map((item) => (
                      <li key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`material-symbols-outlined text-sm ${
                              item.state === "ok"
                                ? "text-[#4edea3]"
                                : item.state === "warn"
                                  ? "text-[#f59e0b]"
                                  : "text-[#94a3b8]"
                            } ${item.state === "waiting" ? "animate-pulse" : ""}`}
                          >
                            {item.state === "ok"
                              ? "check_circle"
                              : item.state === "warn"
                                ? "warning"
                                : "hourglass_empty"}
                          </span>
                          <span
                            className="text-primary/80"
                            title={
                              item.label === "Lighting quality" && item.state === "warn"
                                ? "Try even, front-facing light and reduce harsh shadows."
                                : undefined
                            }
                          >
                            {item.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                          {item.state === "ok"
                            ? "Pass"
                            : item.state === "warn"
                              ? "Check"
                              : "Pending"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </MagicBento>
            </div>
          </div>
          <div className="mt-12 flex justify-center">
            <MagicBento
              enableSpotlight={false}
              enableStars={false}
              enableTilt={false}
              enableMagnetism={false}
              clickEffect={false}
              textAutoHide={false}
              enableBorderGlow
              gridClassName="bento-section"
              cardClassName="magic-bento-card--free"
            >
              <div className="inline-flex items-center gap-3 rounded-full border border-[#1c2d4a] bg-[#0f1c33] px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-soft">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4edea3]"></span>
                Ensuring Security • End-to-End Encryption
              </div>
            </MagicBento>
          </div>
          </div>
        </main>
      </div>
    </ClickSpark>
  );
}
