"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSessionStore } from "@/store/session";

export default function ProcessingPage() {
  const router = useRouter();
  const { submitResult } = useSessionStore();

  useEffect(() => {
    if (!submitResult) {
      return;
    }
    const timer = window.setTimeout(() => {
      router.push("/results");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [router]);

  if (!submitResult) {
    return (
      <div className="processing-background min-h-screen text-[#0b1c30]">
        <header className="fixed top-0 z-50 w-full">
          <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-center px-6 md:px-8">
            <nav className="master-pill-nav" aria-label="Primary navigation">
              <Link className="master-pill-item" href="/">Home</Link>
              <Link className="master-pill-item" href="/#quick-start">Quick Start</Link>
              <Link className="master-pill-item master-pill-upload" href="/upload">Upload</Link>
            </nav>
          </div>
        </header>

        <main className="flex min-h-screen items-center justify-center px-6 pt-24">
          <section className="w-full max-w-2xl rounded-[2rem] bg-white p-10 text-center shadow-2xl shadow-slate-900/5">
            <h1 className="text-3xl font-black tracking-[-0.02em]">
              No submission yet
            </h1>
            <p className="mt-3 text-sm text-[#45464d]">
              Complete capture and ID submission before viewing processing.
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white"
              href="/upload"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Upload
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="processing-background min-h-screen text-[#0b1c30]">
      <header className="fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-center px-6 md:px-8">
          <nav className="master-pill-nav" aria-label="Primary navigation">
            <Link className="master-pill-item" href="/">Home</Link>
            <Link className="master-pill-item" href="/#quick-start">Quick Start</Link>
            <Link className="master-pill-item master-pill-upload" href="/upload">Upload</Link>
          </nav>
        </div>
      </header>

      <main className="flex min-h-screen items-center justify-center px-6 pt-24">
        <section className="w-full max-w-2xl rounded-[2rem] bg-white p-10 text-center shadow-2xl shadow-slate-900/5">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#6ffbbe]/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#005236]">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              sync
            </span>
            Processing
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.02em]">
            Analyzing Uploaded Video
          </h1>
          <p className="mt-3 text-sm text-[#45464d]">
            Face matching and forensic checks are running. You will be redirected
            to verification results automatically.
          </p>

          <div className="mt-8 flex justify-center">
            <div aria-label="Loading" className="loader"></div>
          </div>

          <div className="mt-8 rounded-xl bg-[#eff4ff] px-4 py-3 text-xs text-[#45464d]">
            Secure pipeline active: biometric extraction, liveness scoring, and
            anomaly checks in progress.
          </div>

          <Link
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white"
            href="/results"
          >
            sync
          </span>
          Processing
        </p>
        <h1 className="mt-5 text-4xl font-black tracking-[-0.02em]">
          Analyzing Uploaded Media
        </h1>
        <p className="mt-3 text-sm text-[#45464d]">
          Deepfake and artifact checks are running. You will be redirected to
          verification results automatically.
        </p>

        <div className="mt-8 flex justify-center">
          <div aria-label="Loading" className="loader"></div>
        </div>

        <div className="mt-8 rounded-xl bg-[#eff4ff] px-4 py-3 text-xs text-[#45464d]">
          Secure pipeline active: spatial, frequency, and temporal checks in
          progress.
        </div>

        <Link
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white"
          href="/results"
        >
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
          View Results Now
        </Link>
      </section>
    </main>
  );
}
