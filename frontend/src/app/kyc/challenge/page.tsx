"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChallengeCard } from "@/components/challenge";
import { useSessionStore } from "@/store/session";

export default function KycChallengePage() {
  const router = useRouter();
  const { challenges, lastFrame, frameCount, sessionId } = useSessionStore();

  useEffect(() => {
    if (!sessionId) {
      router.replace("/kyc/start");
    }
  }, [router, sessionId]);

  const challenge = challenges[0] ?? null;
  const challengePassed = lastFrame?.challenge_passed ?? false;

  return (
    <main className="hero-background min-h-screen px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl bg-white/70 p-8 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#45464d]">
            Step 3
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0b1c30]">
            Complete the live challenge
          </h1>
          <p className="mt-3 text-sm text-[#45464d]">
            Follow the on-screen instruction to verify liveness. When the
            challenge passes you can proceed.
          </p>
        </div>

        <ChallengeCard challenge={challenge} passed={challengePassed} />

        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#45464d]">Frames captured</span>
            <span className="font-semibold text-black">{frameCount}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/kyc/submit"
              className={`rounded-xl px-6 py-3 text-sm font-bold ${
                challengePassed
                  ? "bg-black text-white"
                  : "pointer-events-none cursor-not-allowed bg-[#d3e4fe] text-[#57657b]"
              }`}
              aria-disabled={!challengePassed}
              tabIndex={challengePassed ? 0 : -1}
            >
              Continue to Submit
            </Link>
            <Link
              href="/kyc/capture"
              className="rounded-xl bg-[#d3e4fe] px-6 py-3 text-sm font-bold text-[#57657b]"
            >
              Back to Capture
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
