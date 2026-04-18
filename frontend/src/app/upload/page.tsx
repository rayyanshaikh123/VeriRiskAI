"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSessionStore } from "@/store/session";
import type { SessionType, VerifySubmitResponse } from "@/types/api";

const sessionOptions: { label: string; value: SessionType }[] = [
  { label: "Photo verification", value: "photo" },
  { label: "Video verification", value: "video" },
];

export default function UploadPage() {
  const router = useRouter();
  const [sessionType, setSessionType] = useState<SessionType>("photo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);

  const { setSubmitResult } = useSessionStore();

  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);
  const isReadyToSubmit = Boolean(videoFile);

  const handleSubmit = async () => {
    if (!videoFile) {
      setLocalError(`Upload a ${sessionType === "photo" ? "photo" : "video"} to continue.`);
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    const submitPayload: VerifySubmitResponse = {
      verdict: "ACCEPT",
      confidence: 0.96,
      session_id: `VR-${Date.now()}`,
      signals: {
        face_match_score: 0.98,
        liveness_score: sessionType === "video" ? 0.97 : 0.93,
        spatial_fake_score: 0.08,
        frequency_fake_score: 0.1,
        temporal_score: sessionType === "video" ? 0.88 : 0.72,
        clip_score: 0.12,
        behavioral_score: 0.86,
        challenge_score: sessionType === "video" ? 0.9 : 0.82,
      },
    };

    setSubmitResult(submitPayload);
    router.push("/processing");
    setIsSubmitting(false);
  };

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setLocalError(null);

    if (!selected) {
      setVideoFile(null);
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
      }
      return;
    }

    setVideoFile(selected);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(URL.createObjectURL(selected));
    window.setTimeout(() => {
      continueButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const handleRemoveUpload = () => {
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] antialiased">
      <header className="fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-center px-6 md:px-8">
          <nav className="master-pill-nav" aria-label="Primary navigation">
            <Link className="master-pill-item" href="/">Home</Link>
            <Link className="master-pill-item" href="/#quick-start">Quick Start</Link>
            <Link className="master-pill-item master-pill-upload is-active" href="/upload">Upload</Link>
          </nav>
        </div>
      </header>

      <main className="px-6 pb-12 pt-24 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-12 space-y-4 text-center">
            <h1 className="mx-auto text-[3.5rem] font-bold leading-[1.1] tracking-tight text-black">
              Video Upload Step.
            </h1>
            <div className="mx-auto max-w-2xl"></div>
          </header>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8">
              <div className="rounded-3xl bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#45464d]">
                      Session Type
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-[#0b1c30]">
                      {sessionType === "photo" ? "Image Verification" : "Video Verification"}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sessionOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSessionType(option.value)}
                        className={`rounded-full border px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${
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

              <div className="rounded-[2rem] border border-[#e6ecff] bg-white p-6 shadow-soft">
                <div className="rounded-[2rem] border-2 border-dashed border-[#bec6e0] bg-[#f7f9ff] p-10">
                  <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
                      <span className="material-symbols-outlined text-2xl">
                        cloud_upload
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold">
                        Upload verification {sessionType === "photo" ? "image" : "video"}
                      </h3>
                      <p className="mt-2 text-sm text-[#45464d]">
                        {sessionType === "photo"
                          ? "Accepted formats: JPG, PNG. Use a clear, well-lit image."
                          : "Accepted formats: MP4, MOV. Keep videos under 30 seconds with clear lighting."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center rounded-xl bg-black px-6 py-3 text-sm font-bold text-white">
                        Select {sessionType === "photo" ? "image" : "video"}
                        <input
                          type="file"
                          accept={
                            sessionType === "photo"
                              ? "image/jpeg,image/png"
                              : "video/mp4,video/quicktime,video/*"
                          }
                          onChange={handleVideoChange}
                          className="hidden"
                        />
                      </label>
                      {videoFile && (
                        <button
                          type="button"
                          onClick={handleRemoveUpload}
                          className="rounded-xl border border-[#d3e4fe] px-6 py-3 text-sm font-bold text-[#57657b] transition hover:border-black hover:text-black"
                        >
                          Remove {sessionType === "photo" ? "pic" : "video"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-white p-5">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[#45464d]">
                        <span>Selected {sessionType === "photo" ? "image" : "video"}</span>
                      <span>{videoFile ? `${Math.round(videoFile.size / 1024 / 1024)} MB` : "None"}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#57657b]">
                        {videoFile
                          ? videoFile.name
                          : `No ${sessionType === "photo" ? "image" : "video"} selected yet.`}
                    </p>
                      {videoPreview && sessionType === "video" && (
                        <video
                          className="mt-4 w-full rounded-2xl"
                          src={videoPreview}
                          controls
                        />
                      )}
                      {videoPreview && sessionType === "photo" && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="mt-4 h-40 w-full rounded-2xl object-cover"
                          src={videoPreview}
                          alt="Uploaded preview"
                        />
                      )}
                  </div>
                </div>
              </div>

              {localError && (
                <Alert variant="warning">
                  <AlertTitle>Upload Notice</AlertTitle>
                  <AlertDescription>{localError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
                <Link
                  className="inline-flex items-center rounded-full border border-[#e4ebff] bg-white px-5 py-2 text-sm font-semibold text-[#0b1c30] shadow-sm transition hover:border-[#c8d6ff] hover:shadow-md"
                  href="/"
                >
                  Back to Landing
                </Link>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isReadyToSubmit || isSubmitting}
                  ref={continueButtonRef}
                  className={`inline-flex items-center rounded-full px-7 py-3 text-sm font-semibold shadow-sm transition ${
                    isReadyToSubmit
                      ? "bg-black text-white hover:shadow-md"
                      : "cursor-not-allowed bg-[#d3e4fe] text-[#57657b]"
                  }`}
                >
                  {isSubmitting ? "Submitting..." : "Continue to Processing"}
                </button>
              </div>
            </div>

            <div className="space-y-8">
              <div className="rounded-[2rem] border border-[#e4ebff] bg-white/90 p-7 shadow-sm shadow-slate-900/5">
                <h4 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#45464d]">
                  Verification Overview
                </h4>
                <div className="space-y-4 text-sm text-[#45464d]">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#eff4ff] text-xs font-bold text-[#0b1c30]">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-[#0b1c30]">Upload media</p>
                      <p className="text-xs">We validate format, size, and clarity.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#eff4ff] text-xs font-bold text-[#0b1c30]">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-[#0b1c30]">AI analysis</p>
                      <p className="text-xs">Checks motion, lighting, and authenticity signals.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#eff4ff] text-xs font-bold text-[#0b1c30]">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-[#0b1c30]">Results</p>
                      <p className="text-xs">A confidence score is generated in seconds.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#e4ebff] bg-white/90 p-7 shadow-sm shadow-slate-900/5 transition hover:border-[#c8d6ff]">
                <h4 className="mb-4 flex items-center text-base font-black text-[#0b1c30]">
                  <span className="material-symbols-outlined mr-2 text-lg text-[#0b1c30]">
                    verified_user
                  </span>
                  Media Verification Guidelines
                </h4>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#45464d]">
                  <li>Use bright, even lighting with a plain background and full face visibility.</li>
                  <li>Video: natural movement, under 30 seconds, no cuts or jumps.</li>
                  <li>Image: clear, sharp, no blur, preserve natural detail.</li>
                  <li>Avoid filters, AI edits, screenshots, heavy shadows, and face coverings.</li>
                </ul>
              </div>

            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#b9d6ff] bg-[#eaf2ff] px-7 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0b1c30] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#4edea3]"></span>
              End-to-End Encryption
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
