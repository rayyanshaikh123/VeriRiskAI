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
      <div className="processing-background min-h-screen text-primary">
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
          <section className="surface-card w-full max-w-2xl p-10 text-center">
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-primary">
              No submission yet
            </h1>
            <p className="mt-3 text-sm text-muted">
              Complete capture and ID submission before viewing processing.
            </p>
            <Link
              className="btn-primary mt-6 px-5 py-3 text-sm"
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
    <div className="processing-background min-h-screen text-primary">
      <header className="fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-center px-6 md:px-8">
          <nav className="master-pill-nav" aria-label="Primary navigation">
            <Link className="master-pill-item" href="/">
              Home
            </Link>
            <Link className="master-pill-item" href="/#quick-start">
              Quick Start
            </Link>
            <Link className="master-pill-item master-pill-upload" href="/upload">
              Upload
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex min-h-screen items-center justify-center px-6 pt-24">
          <section className="surface-card w-full max-w-2xl p-10 text-center">
          <p className="badge mb-5">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              sync
            </span>
            Processing
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-primary md:text-4xl">
            Analyzing Uploaded Media
          </h1>
          <p className="mt-3 text-sm text-muted">
            Deepfake and artifact checks are running. You will be redirected to
            verification results automatically.
          </p>

          <div className="mt-8 flex justify-center">
            <div aria-label="Loading" className="loader"></div>
          </div>

          <div className="mt-8 rounded-xl border border-muted/40 bg-[var(--surface-muted)] px-4 py-3 text-xs text-muted">
            Secure pipeline active: spatial, frequency, and temporal checks in
            progress.
          </div>

          <Link
            className="btn-primary mt-6 px-5 py-3 text-sm"
            href="/results"
          >
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
            View Results Now
          </Link>
        </section>
      </main>
    </div>
  );
}
