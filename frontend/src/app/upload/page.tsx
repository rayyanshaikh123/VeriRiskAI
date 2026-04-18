"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
              Upload Verification Media.
            </h1>
            <p className="max-w-xl text-lg text-[#45464d]">
              Upload a selfie image or short video to trigger offline deepfake analysis.
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
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className="text-[#57657b]">Demo:</span>
                      {demoUsers.map((demo) => (
                        <button
                          key={demo}
                          type="button"
                          onClick={() => setUserId(demo)}
                          className="rounded-full border border-[#d3e4fe] bg-[#f4f8ff] px-3 py-1 text-[#2f3a4d] transition hover:border-black"
                        >
                          {demo}
                        </button>
                      ))}
                    </div>
                  </label>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#45464d]">
                      Input type
                    </p>
                    <div className="grid gap-2">
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
                          className={`rounded-2xl border px-4 py-2 text-left text-xs font-semibold transition ${
                            inputType === option.value
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

              <div className="rounded-[2rem] border border-white/40 bg-white p-6">
                <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-[#45464d]">
                  Upload media
                </h4>
                <input
                  type="file"
                  accept={
                    inputType === "image"
                      ? "image/jpeg,image/png"
                      : "video/mp4,video/webm,video/quicktime"
                  }
                  onChange={handleFileChange}
                  className="w-full text-sm"
                />

                {previewUrl && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-[#d3e4fe]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Selfie preview"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                )}

                {fileMeta && !previewUrl && (
                  <div className="mt-4 rounded-2xl border border-dashed border-[#c6c6cd] p-4 text-sm text-[#45464d]">
                    <div className="font-semibold text-[#0b1c30]">{fileMeta.name}</div>
                    <div className="text-xs">{fileMeta.size}</div>
                  </div>
                )}
              </div>

              {(localError || error) && (
                <Alert variant="danger">
                  <AlertTitle>{error ? error.code : "Upload error"}</AlertTitle>
                  <AlertDescription>{error ? error.message : localError}</AlertDescription>
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
                  disabled={isSubmitting}
                  className={`group flex items-center space-x-4 rounded-xl px-8 py-4 text-lg font-bold transition ${
                    isSubmitting
                      ? "cursor-not-allowed bg-[#d3e4fe] text-[#57657b]"
                      : "bg-black text-white"
                  }`}
                >
                  <span>{isSubmitting ? "Uploading..." : "Continue to Processing"}</span>
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-8 lg:col-span-4">
              <div className="rounded-[2rem] border border-white/40 bg-white p-6">
                <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-[#45464d]">
                  Upload checklist
                </h4>
                <ul className="space-y-2 text-xs text-[#45464d]">
                  <li>Single selfie image or short video only.</li>
                  <li>JPEG/PNG for images, MP4/WEBM for video.</li>
                  <li>Keep lighting even and avoid motion blur.</li>
                </ul>
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
                      <h5 className="mb-1 text-sm font-bold">Avoid Direct Glare</h5>
                      <p className="text-xs leading-relaxed text-[#45464d]">
                        Ensure lighting is uniform and your face is fully visible.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ffd36f]">
                      <span className="material-symbols-outlined text-sm text-[#7a4f00]">
                        crop
                      </span>
                    </div>
                    <div>
                      <h5 className="mb-1 text-sm font-bold">Keep In Frame</h5>
                      <p className="text-xs leading-relaxed text-[#45464d]">
                        Avoid cropped foreheads or chins for best detection quality.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#cddcff]">
                      <span className="material-symbols-outlined text-sm text-[#233b72]">
                        visibility
                      </span>
                    </div>
                    <div>
                      <h5 className="mb-1 text-sm font-bold">Readable Detail</h5>
                      <p className="text-xs leading-relaxed text-[#45464d]">
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
