"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import Threads from "../../components/Threads";
import SpotlightCard from "../../components/SpotlightCard";
import BlurText from "../../components/BlurText";

export default function HomePage() {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  if (showLoader) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="flex min-h-screen w-full items-center justify-center bg-black px-4"
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(18px)", y: 8 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative z-10 w-full text-center"
        >
          <h2 className="relative mx-auto h-[1.15em] w-[12ch] text-center text-5xl font-extrabold leading-[1.05] text-white md:text-7xl">
            <motion.span
              className="absolute inset-0 inline-flex items-center justify-center"
              initial={{ opacity: 0, filter: "blur(14px)" }}
              animate={{
                opacity: [0, 1, 1, 0],
                filter: ["blur(14px)", "blur(0px)", "blur(0px)", "blur(10px)"]
              }}
              transition={{ duration: 1.6, ease: "easeInOut", times: [0, 0.28, 0.72, 1] }}
            >
              Introducing
            </motion.span>
            <motion.span
              className="absolute inset-0 inline-flex items-center justify-center"
              initial={{ opacity: 0, filter: "blur(16px)" }}
              animate={{
                opacity: [0, 1, 1, 0],
                filter: ["blur(16px)", "blur(0px)", "blur(0px)", "blur(12px)"]
              }}
              transition={{ duration: 1.6, ease: "easeInOut", delay: 1.55, times: [0, 0.3, 0.72, 1] }}
            >
              VeriRisk
            </motion.span>
          </h2>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="page-background flex min-h-screen flex-col antialiased">
      <header className="fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-center px-6 md:px-8">
          <nav className="master-pill-nav" aria-label="Primary navigation">
            <a className="master-pill-item is-active" href="#hero-primary">
              Home
            </a>
            <a className="master-pill-item" href="#quick-start">
              Quick Start
            </a>
            <Link className="master-pill-item master-pill-upload" href="/upload">
              Upload
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section
          className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 pt-10 md:px-12"
          id="hero-primary"
        >
          <div className="pointer-events-none absolute inset-0 z-0 opacity-100" aria-hidden="true">
            <Threads color={[1, 1, 1]} amplitude={1} distance={0.5} />
          </div>
          <div className="relative z-10 w-full max-w-4xl text-center">
            <p className="badge mb-4">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              AI Deepfake Defense
            </p>
            <h1 className="heading-hero -mt-2 mb-5 md:-mt-4">
              <BlurText
                as="span"
                className="block justify-center"
                text="Know Who's Real,"
                delay={140}
                animateBy="words"
                direction="top"
              />
              <BlurText
                as="span"
                className="block justify-center"
                text="Instantly."
                delay={140}
                animateBy="words"
                direction="top"
                rootMargin="0px 0px -8% 0px"
              />
            </h1>
            <p className="lead mx-auto max-w-2xl">
              Advanced AI detection for secure identity verification across HR and fintech systems.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link className="btn-primary px-7 py-3 text-sm" href="/upload">
                Start Verification
              </Link>
              <a className="btn-secondary px-7 py-3 text-sm" href="#quick-start">
                Learn More
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto min-h-[70vh] max-w-[96rem] px-6 py-16 md:px-8 md:py-20" id="features">
          <div className="mb-10">
            <h2 className="heading-section">Core Detection Capabilities</h2>
            <p className="lead mt-4 max-w-4xl md:text-lg">
              Multi-layer AI analysis designed to identify synthetic media and ensure identity authenticity.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <SpotlightCard className="surface-card min-h-[260px] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 text-[32px] text-muted">texture</span>
              <h3 className="text-xl font-semibold text-primary">Spatial Artifact Detection</h3>
              <p className="mt-3 max-w-[36ch] text-base leading-relaxed text-muted">
                Identifies visual inconsistencies such as unnatural textures, blending errors, and facial distortions.
              </p>
            </SpotlightCard>

            <SpotlightCard className="surface-card min-h-[260px] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 text-[32px] text-muted">equalizer</span>
              <h3 className="text-xl font-semibold text-primary">Frequency Analysis</h3>
              <p className="mt-3 max-w-[36ch] text-base leading-relaxed text-muted">
                Analyzes hidden patterns in frequency space to detect synthetic generation artifacts.
              </p>
            </SpotlightCard>

            <SpotlightCard className="surface-card min-h-[260px] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 text-[32px] text-muted">movie</span>
              <h3 className="text-xl font-semibold text-primary">Temporal Consistency</h3>
              <p className="mt-3 max-w-[36ch] text-base leading-relaxed text-muted">
                Evaluates frame-to-frame continuity to detect unnatural motion and deepfake instability.
              </p>
            </SpotlightCard>

            <SpotlightCard className="surface-card min-h-[260px] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 text-[32px] text-muted">face_retouching_natural</span>
              <h3 className="text-xl font-semibold text-primary">Liveness Verification</h3>
              <p className="mt-3 max-w-[36ch] text-base leading-relaxed text-muted">
                Detects real human signals like blinking and micro-expressions to prevent spoofing.
              </p>
            </SpotlightCard>
          </div>
        </section>

        <section className="mx-auto min-h-[75vh] max-w-[96rem] px-6 py-14 md:px-8" id="quick-start">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="heading-section">How It Works</h2>
              <p className="lead mt-3 max-w-3xl md:text-lg">
                A streamlined, multi-step pipeline that verifies identity authenticity using advanced AI analysis.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Simple Sequence
            </span>
          </div>
          <div className="mb-8 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            <span>Upload</span>
            <span className="flow-segment flow-segment--active"></span>
            <span>Analyze</span>
            <span className="flow-segment"></span>
            <span>Verify</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <article className="surface-card min-h-[240px] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 block w-fit text-[32px] text-muted md:mx-auto">
                upload_file
              </span>
              <h3 className="text-xl font-semibold text-primary">Upload Media</h3>
              <p className="mt-3 max-w-[34ch] text-base leading-relaxed text-muted">
                Submit a selfie image or short video for identity verification. The system securely processes supported formats in real time.
              </p>
            </article>
            <article className="surface-card min-h-[240px] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 block w-fit text-[32px] text-muted md:mx-auto">
                autorenew
              </span>
              <h3 className="text-xl font-semibold text-primary">AI Analysis</h3>
              <p className="mt-3 max-w-[34ch] text-base leading-relaxed text-muted">
                Multiple AI models analyze spatial artifacts, frequency patterns, and temporal consistency to detect synthetic manipulation.
              </p>
            </article>
            <article className="surface-card min-h-[240px] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 block w-fit text-[32px] text-muted md:mx-auto">
                task_alt
              </span>
              <h3 className="text-xl font-semibold text-primary">Verification Result</h3>
              <p className="mt-3 max-w-[34ch] text-base leading-relaxed text-muted">
                Receive a clear authenticity decision with confidence score and detection insights for informed action.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto min-h-[20vh] w-full max-w-[96rem] px-6 pb-16 md:px-8" id="cta">
          <div className="surface-card flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-10">
            <div>
              <h2 className="text-2xl font-semibold text-primary md:text-3xl">
                Ready to verify a new identity?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
                Upload a selfie image or short video and get instant deepfake analysis with confidence scoring.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="btn-primary px-6 py-3 text-sm" href="/upload">
                Start Verification
              </Link>
              <a className="btn-secondary px-6 py-3 text-sm" href="#features">
                Explore Capabilities
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto w-full px-6 pb-10 pt-6 md:px-8" id="security">
        <div className="surface-muted w-full px-6 py-8 md:px-8 md:py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-start">
            <div>
              <p className="text-lg font-semibold tracking-tight text-primary">VeriRisk AI</p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                AI-powered deepfake detection for secure identity verification.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Navigation</p>
              <div className="mt-4 flex flex-col gap-2 text-sm font-medium text-primary">
                <a className="transition-opacity hover:opacity-80" href="#hero-primary">Home</a>
                <Link className="transition-opacity hover:opacity-80" href="/upload">Upload</Link>
                <a className="transition-opacity hover:opacity-80" href="#quick-start">Verification Flow</a>
                <a className="transition-opacity hover:opacity-80" href="#features">Features</a>
              </div>
            </div>

            <div className="md:text-right">
              <p className="text-sm font-semibold text-primary">Built for HR & Fintech Systems</p>
              <span className="border-muted mt-3 inline-flex rounded-full border bg-transparent px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Secure • Compliant • Real-time
              </span>
            </div>
          </div>

          <div className="border-muted mt-8 border-t pt-4 text-xs text-muted">
            © 2026 VeriRisk AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
