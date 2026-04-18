"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError, submitVerification } from "@/lib/api";
import { stripBase64Prefix, validateImageFile, validateImagePixels } from "@/lib/validators";
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
  const [retryPayload, setRetryPayload] = useState<string | null>(null);
  const { sessionId, setSubmitResult, resetSession } = useSessionStore();

  useEffect(() => {
    if (!sessionId) {
      router.replace("/kyc/start");
    }
  }, [router, sessionId]);

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
    setRetryPayload(null);

    if (!selected) {
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
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
    } catch (error) {
      setLocalError("Unable to validate image dimensions");
      return;
    }

    setFile(selected);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const sendPayload = async (payload: string) => {
    if (!sessionId) {
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `idempotency-${Date.now()}`;

    const response = await submitVerification(
      {
        session_id: sessionId,
        id_image_b64: payload,
      },
      { idempotencyKey, signal: controller.signal },
    );
    setSubmitResult(response);
    router.push("/kyc/result");
  };

  const handleSubmit = async () => {
    if (!file) {
      setLocalError("Please select an ID image.");
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    try {
      const dataUrl = await fileToBase64(file);
      const base64 = stripBase64Prefix(dataUrl);
      setRetryPayload(base64);
      await sendPayload(base64);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "IDEMPOTENCY_CONFLICT") {
          setLocalError("Idempotency conflict. Retry the submission.");
          return;
        }
        if (err.code === "INVALID_IMAGE") {
          setLocalError("The image was rejected. Please choose another.");
          return;
        }
        if (err.code === "SESSION_EXPIRED" || err.code === "SESSION_NOT_FOUND") {
          resetSession();
          router.replace("/kyc/start");
          return;
        }
        setLocalError(err.message);
      } else {
        setLocalError("Unable to submit the document.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!retryPayload) {
      return;
    }
    setIsSubmitting(true);
    setLocalError(null);
    try {
      await sendPayload(retryPayload);
    } catch (err) {
      if (err instanceof ApiError) {
        setLocalError(err.message);
      } else {
        setLocalError("Unable to retry submission.");
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
              Step 4
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0b1c30]">
              Submit your ID document
            </h1>
            <p className="mt-3 text-sm text-[#45464d]">
              Upload a clear photo of a government-issued ID. The image must be
              JPEG or PNG and under 2MB.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#45464d]">
              ID Image
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                className="mt-3 w-full text-sm"
              />
            </label>

            {previewUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#d3e4fe]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="ID preview"
                  className="h-64 w-full object-cover"
                />
              </div>
            )}

            {localError && (
              <Alert variant="danger" className="mt-4">
                <AlertTitle>Submission error</AlertTitle>
                <AlertDescription>{localError}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Submit Verification"}
              </button>
              <Link
                href="/kyc/challenge"
                className="rounded-xl bg-[#d3e4fe] px-6 py-3 text-sm font-bold text-[#57657b]"
              >
                Back
              </Link>
              {retryPayload && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-xl border border-black px-6 py-3 text-sm font-bold text-black"
                >
                  Retry Submit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-[#eff4ff] p-6">
            <p className="text-xs font-black uppercase tracking-widest text-[#45464d]">
              Quality checklist
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#45464d]">
              <li>Ensure all four corners of the ID are visible.</li>
              <li>Avoid glare, reflections, or heavy shadows.</li>
              <li>Text should be sharp and readable.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
