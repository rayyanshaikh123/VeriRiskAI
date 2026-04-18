"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
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

export default function KycSubmitPage() {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { userId, inputType, setSubmitResult, setError, clearError, error } =
    useSessionStore();

  useEffect(() => {
    if (!userId) {
      router.replace("/kyc/start");
    }
  }, [router, userId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  const handleSubmit = async () => {
    if (!userId) {
      return;
    }
    if (!file) {
      setLocalError("Please select a file.");
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);
    clearError();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const dataUrl = await fileToBase64(file);
      const base64 = stripBase64Prefix(dataUrl);
      const response = await uploadVerification(
        {
          user_id: userId,
          input_type: inputType,
          file: base64,
        },
        { signal: controller.signal },
      );
      setSubmitResult(response);
      router.push("/kyc/result");
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
          message: "Unable to submit the file.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="processing-background min-h-screen px-6 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-8 shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#45464d]">
              Step 2
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0b1c30]">
              Upload {inputType === "image" ? "selfie image" : "short video"}
            </h1>
            <p className="mt-3 text-sm text-[#45464d]">
              The file will be analyzed offline for deepfake artifacts.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#45464d]">
              {inputType === "image" ? "Selfie image" : "Short video"}
              <input
                type="file"
                accept={
                  inputType === "image"
                    ? "image/jpeg,image/png"
                    : "video/mp4,video/webm,video/quicktime"
                }
                onChange={handleFileChange}
                className="mt-3 w-full text-sm"
              />
            </label>

            {previewUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#d3e4fe]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selfie preview"
                  className="h-64 w-full object-cover"
                />
              </div>
            )}

            {(localError || error) && (
              <Alert variant="danger" className="mt-4">
                <AlertTitle>{error ? error.code : "Upload error"}</AlertTitle>
                <AlertDescription>{error ? error.message : localError}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Uploading..." : "Run Verification"}
              </button>
              <Link
                href="/kyc/start"
                className="rounded-xl bg-[#d3e4fe] px-6 py-3 text-sm font-bold text-[#57657b]"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
