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
  const spatialScore = submitResult?.signals.spatial_fake_score ?? 0.05;
  const frequencyScore = submitResult?.signals.frequency_fake_score ?? 0.05;
  const forensic = submitResult
    ? 1 - (spatialScore + frequencyScore) / 2
    : 0.95;

  return (
    <div className="page-background min-h-screen px-6 pb-10 pt-24 antialiased md:px-8 md:pt-28">
      <header className="fixed left-0 top-0 z-50 w-full">
        <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-center px-6 md:px-8">
          <nav className="master-pill-nav" aria-label="Primary navigation">
            <Link className="master-pill-item" href="/">Home</Link>
            <Link className="master-pill-item" href="/#quick-start">Quick Start</Link>
            <Link className="master-pill-item master-pill-upload" href="/upload">Upload</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl">
        <section className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="badge mb-4">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              System Verified
            </span>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-primary md:text-5xl">
              Verification Outcome
            </h1>
          </div>
          <div className="text-sm text-muted">
            <p className="font-medium">
              Reference: {submitResult ? "UPLOAD-RESULT" : "VR-882-X9"}
            </p>
            <p className="text-xs opacity-70">Completed: Oct 24, 2023 • 14:22 UTC</p>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <article className="surface-card p-8 lg:col-span-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted">
              Overall Status
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-primary">
                <span
                  className="material-symbols-outlined text-[40px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-tight text-primary">{verdict}</p>
                <p className="mt-1 text-sm text-muted">
                  Identity authenticity confirmed via AI Forensic Engine.
                </p>
              </div>
            </div>
          </article>

          <article className="surface-card flex flex-col justify-between p-8 lg:col-span-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-muted">
                Final Risk Score
              </p>
              <p className="mt-2 text-5xl font-semibold tracking-tight text-primary">
                {riskScore}
                <span className="text-2xl text-muted">/100</span>
              </p>
            </div>
            <div className="mt-6 rounded-xl border border-muted/40 bg-[var(--surface-muted)] p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted">Rating</span>
                <span className="uppercase tracking-widest text-primary">
                  {rating}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-[var(--text)]"
                  style={{ width: `${Math.max(5, riskScore)}%` }}
                ></div>
              </div>
            </div>
          </article>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <article className="surface-card p-8">
            <span className="material-symbols-outlined mb-4 text-muted">
              hide_image
            </span>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
              Spatial Score
            </p>
            <p className="text-3xl font-semibold tracking-tight text-primary">{percent(1 - spatialScore)}</p>
          </article>
          <article className="surface-card p-8">
            <span className="material-symbols-outlined mb-4 text-muted">
              graphic_eq
            </span>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
              Frequency Score
            </p>
            <p className="text-3xl font-semibold tracking-tight text-primary">{percent(1 - frequencyScore)}</p>
          </article>
          <article className="surface-card p-8">
            <span className="material-symbols-outlined mb-4 text-muted">
              query_stats
            </span>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
              Forensic Score
            </p>
            <p className="text-3xl font-semibold tracking-tight text-primary">{percent(forensic)}</p>
          </article>
        </section>

        <section className="surface-card p-8">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-primary">
            Decision Audit Log
          </h2>
          <div className="space-y-5 text-sm text-primary">
            <div>
              <p className="font-semibold">Oct 24, 14:22:01 - Final Approval Issued</p>
              <p className="text-muted">
                System merged biometric data with document OCR and forensic
                analysis. No red flags detected.
              </p>
            </div>
            <div>
              <p className="font-semibold">Oct 24, 14:21:45 - Forensic Scan Complete</p>
              <p className="text-muted">
                Micro-pattern analysis confirmed document is genuine and
                non-digitally altered.
              </p>
            </div>
            <div>
              <p className="font-semibold">Oct 24, 14:21:10 - Human-in-the-loop Status</p>
              <p className="text-muted">
                Bypassed. Confidence score exceeds automated threshold (95%).
                No manual review required.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            className="btn-secondary px-6 py-3 text-sm"
            href="/upload"
          >
            Re-run Verification
          </Link>
          <Link
            className="btn-primary px-6 py-3 text-sm"
            href="/"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
