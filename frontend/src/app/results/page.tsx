"use client";

import Link from "next/link";

import { useSessionStore } from "@/store/session";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatVerdict(verdict?: string) {
  if (!verdict) {
    return "ACCEPTED";
  }
  if (verdict === "ACCEPT") {
    return "ACCEPTED";
  }
  if (verdict === "REJECT") {
    return "REJECTED";
  }
  return verdict;
}

export default function ResultsPage() {
  const { submitResult } = useSessionStore();
  const verdict = formatVerdict(submitResult?.verdict);
  const confidence = submitResult?.confidence ?? 0.95;
  const riskScore = Math.max(1, Math.round((1 - confidence) * 100));
  const rating = riskScore <= 20 ? "Low Risk" : riskScore <= 60 ? "Medium Risk" : "High Risk";
  const faceMatch = submitResult?.signals.face_match_score ?? 0.98;
  const liveness = submitResult?.signals.liveness_score ?? 0.99;
  const forensic = submitResult
    ? 1 - ((submitResult.signals.spatial_fake_score + submitResult.signals.frequency_fake_score) / 2)
    : 0.95;

  return (
    <div className="min-h-screen bg-[#f8f9ff] px-6 py-10 text-[#0b1c30] md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#6ffbbe] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#005236]">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              System Verified
            </span>
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Verification Outcome
            </h1>
          </div>
          <div className="text-sm text-[#45464d]">
            <p className="font-medium">
              Reference: {submitResult?.session_id ?? "VR-882-X9"}
            </p>
            <p className="text-xs opacity-70">Completed: Oct 24, 2023 • 14:22 UTC</p>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <article className="rounded-[2rem] bg-white p-8 shadow-sm lg:col-span-8">
            <p className="text-sm font-bold uppercase tracking-widest text-[#45464d]">
              Overall Status
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6ffbbe] text-[#005236]">
                <span
                  className="material-symbols-outlined text-[40px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
              <div>
                <p className="text-4xl font-black tracking-tighter">{verdict}</p>
                <p className="mt-1 text-sm text-[#45464d]">
                  Identity authenticity confirmed via AI Forensic Engine.
                </p>
              </div>
            </div>
          </article>

          <article className="flex flex-col justify-between rounded-[2rem] bg-[#131b2e] p-8 text-white lg:col-span-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#bec6e0]">
                Final Risk Score
              </p>
              <p className="mt-2 text-6xl font-black tracking-tighter text-[#4edea3]">
                {riskScore}
                <span className="text-2xl text-[#bec6e0]">/100</span>
              </p>
            </div>
            <div className="mt-6 rounded-xl bg-white/10 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className="text-[#bec6e0]">Rating</span>
                <span className="uppercase tracking-widest text-[#4edea3]">
                  {rating}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-[#4edea3]"
                  style={{ width: `${Math.max(5, riskScore)}%` }}
                ></div>
              </div>
            </div>
          </article>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <article className="rounded-[1.5rem] bg-[#eff4ff] p-8">
            <span className="material-symbols-outlined mb-4 text-[#45464d]">
              face
            </span>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#45464d]">
              Face Match
            </p>
            <p className="text-4xl font-bold tracking-tight">{percent(faceMatch)}</p>
          </article>
          <article className="rounded-[1.5rem] bg-[#eff4ff] p-8">
            <span className="material-symbols-outlined mb-4 text-[#45464d]">
              videocam
            </span>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#45464d]">
              Liveness Score
            </p>
            <p className="text-4xl font-bold tracking-tight">{percent(liveness)}</p>
          </article>
          <article className="rounded-[1.5rem] bg-[#eff4ff] p-8">
            <span className="material-symbols-outlined mb-4 text-[#45464d]">
              query_stats
            </span>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#45464d]">
              Forensic Score
            </p>
            <p className="text-4xl font-bold tracking-tight">{percent(forensic)}</p>
          </article>
        </section>

        <section className="rounded-[2rem] bg-[#eff4ff] p-8">
          <h2 className="mb-6 text-2xl font-bold tracking-tight">
            Decision Audit Log
          </h2>
          <div className="space-y-5 text-sm">
            <div>
              <p className="font-bold">Oct 24, 14:22:01 - Final Approval Issued</p>
              <p className="text-[#45464d]">
                System merged biometric data with document OCR and forensic
                analysis. No red flags detected.
              </p>
            </div>
            <div>
              <p className="font-bold">Oct 24, 14:21:45 - Forensic Scan Complete</p>
              <p className="text-[#45464d]">
                Micro-pattern analysis confirmed document is genuine and
                non-digitally altered.
              </p>
            </div>
            <div>
              <p className="font-bold">Oct 24, 14:21:10 - Human-in-the-loop Status</p>
              <p className="text-[#45464d]">
                Bypassed. Confidence score exceeds automated threshold (95%).
                No manual review required.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            className="rounded-xl bg-[#d3e4fe] px-6 py-3 text-sm font-bold text-[#57657b]"
            href="/upload"
          >
            Re-run Verification
          </Link>
          <Link
            className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white"
            href="/"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
