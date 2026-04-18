"use client";

import Link from "next/link";

import { useSessionStore } from "@/store/session";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function KycResultPage() {
  const { submitResult, resetSession } = useSessionStore();

  if (!submitResult) {
    return (
      <main className="hero-background min-h-screen px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white/70 p-8 shadow-soft">
          <h1 className="text-3xl font-black tracking-tight text-[#0b1c30]">
            No result available
          </h1>
          <p className="mt-3 text-sm text-[#45464d]">
            Start a new session to generate a verification result.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/kyc/start"
              className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white"
            >
              Start New Session
            </Link>
            <Link
              href="/"
              className="rounded-xl bg-[#d3e4fe] px-6 py-3 text-sm font-bold text-[#57657b]"
            >
              Back Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { verdict, confidence, signals } = submitResult;

  return (
    <main className="hero-background min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl bg-white/70 p-8 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#45464d]">
            Step 5
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#0b1c30]">
            Verification result
          </h1>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#eff4ff] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#45464d]">
                Verdict
              </p>
              <p className="mt-2 text-2xl font-black text-[#0b1c30]">
                {verdict}
              </p>
            </div>
            <div className="rounded-2xl bg-[#eff4ff] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#45464d]">
                Confidence
              </p>
              <p className="mt-2 text-2xl font-black text-[#0b1c30]">
                {percent(confidence)}
              </p>
            </div>
            <div className="rounded-2xl bg-[#eff4ff] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#45464d]">
                Input
              </p>
              <p className="mt-2 text-sm font-semibold text-[#0b1c30]">
                Offline batch verification
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-soft">
            <h2 className="text-lg font-bold">Signal breakdown</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#45464d]">Spatial score</span>
                <span className="font-semibold text-black">{percent(signals.spatial_fake_score)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#45464d]">Frequency score</span>
                <span className="font-semibold text-black">{percent(signals.frequency_fake_score)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#45464d]">Temporal score</span>
                <span className="font-semibold text-black">
                  {signals.temporal_score != null
                    ? percent(signals.temporal_score)
                    : "--"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-soft">
            <h2 className="text-lg font-bold">Explainability</h2>
            <p className="mt-2 text-sm text-[#45464d]">
              Batch processing focuses on aggregate artifacts and signal patterns.
            </p>
            <div className="mt-6 rounded-2xl border border-dashed border-[#c6c6cd] p-6 text-sm text-[#45464d]">
              Heatmaps are not generated for upload-only verification.
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/kyc/start"
            onClick={() => resetSession()}
            className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white"
          >
            Start New Upload
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-[#d3e4fe] px-6 py-3 text-sm font-bold text-[#57657b]"
          >
            Back Home
          </Link>
        </div>
      </div>
    </main>
  );
}
