"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      <main className="px-6 pb-16 pt-28 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-12 text-center">
            <h1 className="mb-3 text-3xl font-semibold leading-tight tracking-tight text-primary md:text-5xl">
              Upload Verification Media.
            </h1>
            <p className="mx-auto max-w-xl text-base text-muted md:text-lg">
              Upload a selfie image or short video to trigger offline deepfake analysis.
            </p>
          </header>

          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:justify-center">
            <div className="space-y-8">
              <div className="grid gap-6">
                <div className="space-y-6">
                  <div className="surface-card p-6">
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

                  <div className="surface-card p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                      Input type
                    </p>
                    <div className="mt-3 grid gap-2">
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
                          className={`rounded-lg border px-4 py-3 text-left text-xs font-semibold transition ${inputType === option.value
                              ? "pill-active"
                              : "border-muted bg-[var(--surface)] text-muted"
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="surface-card p-6">
                    <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                      Upload media
                    </h4>
                    <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted bg-[var(--surface)] px-6 py-8 text-center text-sm text-muted transition hover:border-[var(--text)]">
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

                    {previewUrl && (
                      <div className="mt-4 overflow-hidden rounded-lg border border-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Selfie preview"
                          className="h-40 w-full object-cover"
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
                </div>
              </div>

              {(localError || error) && (
                <Alert variant="danger">
                  <AlertTitle>{error ? error.code : "Upload error"}</AlertTitle>
                  <AlertDescription>{error ? error.message : localError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col-reverse items-center gap-4 pt-2 sm:flex-row sm:justify-between">
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
                  className={`btn-primary group w-full px-8 py-4 text-base sm:w-auto ${isSubmitting
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-slate-900 text-white"
                    }`}
                >
                  <span>{isSubmitting ? "Uploading..." : "Continue to Processing"}</span>
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-8">
              <div className="surface-card p-6">
                <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Upload checklist
                </h4>
                <ul className="space-y-2 text-xs text-muted">
                  <li>Single selfie image or short video only.</li>
                  <li>JPEG/PNG for images, MP4/WEBM for video.</li>
                  <li>Keep lighting even and avoid motion blur.</li>
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
