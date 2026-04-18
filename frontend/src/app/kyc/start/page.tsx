"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSessionStore } from "@/store/session";
import type { InputType } from "@/types/api";

const sessionOptions: { label: string; value: InputType }[] = [
  { label: "Selfie image", value: "image" },
  { label: "Short video", value: "video" },
];

export default function KycStartPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [inputType, setInputType] = useState<InputType>("image");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUserInput, setStatus, setError, clearError, error, resetSession } =
    useSessionStore();

  useEffect(() => {
    return () => undefined;
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId.trim()) {
      setError({
        code: "VALIDATION_ERROR",
        message: "User ID is required",
      });
      return;
    }

    resetSession();
    clearError();
    setStatus("loading");
    setIsSubmitting(true);

    try {
      setUserInput(userId.trim(), inputType);
      router.push("/kyc/submit");
    } catch {
      setError({
        code: "UNKNOWN",
        message: "Unable to proceed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="hero-background min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl bg-white/70 p-8 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#45464d]">
            Step 1
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0b1c30]">
            Start a verification session
          </h1>
          <p className="mt-3 text-sm text-[#45464d]">
            Provide a user reference and choose the verification mode to begin
            the KYC workflow.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#45464d]">
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
              <div className="grid gap-3 md:grid-cols-2">
                {sessionOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setInputType(option.value)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
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

            {error && (
              <Alert variant="danger">
                <AlertTitle>{error.code}</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Starting..." : "Start Session"}
              </button>
              <Link
                href="/"
                className="rounded-xl bg-[#d3e4fe] px-6 py-3 text-sm font-bold text-[#57657b]"
              >
                Back Home
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
