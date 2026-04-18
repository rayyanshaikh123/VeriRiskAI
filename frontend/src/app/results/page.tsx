"use client";

import Link from "next/link";
import { jsPDF } from "jspdf";

import { useSessionStore } from "@/store/session";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function clamp01(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
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
  const isReal = verdict === "ACCEPTED";
  const confidence = clamp01(submitResult?.confidence ?? 0.95);
  const confidencePct = Math.round(confidence * 100);
  const riskScore = Math.max(1, Math.round((1 - confidence) * 100));
  const rating = riskScore <= 20 ? "Low Risk" : riskScore <= 60 ? "Medium Risk" : "High Risk";
  const ratingTone = riskScore <= 20 ? "emerald" : riskScore <= 60 ? "amber" : "rose";
  const spatialScore = clamp01(submitResult?.signals.spatial_fake_score ?? 0.05);
  const frequencyScore = clamp01(submitResult?.signals.frequency_fake_score ?? 0.05);
  const temporalScore = submitResult?.signals.temporal_score ?? null;
  const forensic = submitResult
    ? clamp01(1 - (spatialScore + frequencyScore) / 2)
    : 0.95;

  const metrics = [
    {
      label: "Spatial Integrity",
      value: clamp01(1 - spatialScore),
      icon: "hide_image",
    },
    {
      label: "Frequency Integrity",
      value: clamp01(1 - frequencyScore),
      icon: "graphic_eq",
    },
    {
      label: "Forensic Confidence",
      value: forensic,
      icon: "query_stats",
    },
  ];

  if (temporalScore !== null && temporalScore !== undefined) {
    metrics.push({
      label: "Temporal Consistency",
      value: clamp01(1 - temporalScore),
      icon: "movie",
    });
  }

  const flags = submitResult?.flags ?? {
    artifact_flag: false,
    frequency_anomaly: false,
    temporal_inconsistency: false,
    watermark_detected: false,
  };

  const signalWeights = [
    { label: "Spatial", value: spatialScore },
    { label: "Frequency", value: frequencyScore },
    { label: "Temporal", value: temporalScore ?? 0 },
    { label: "Artifact", value: submitResult?.flags?.artifact_flag ? 0.65 : 0.15 },
    { label: "Watermark", value: submitResult?.flags?.watermark_detected ? 0.7 : 0.1 },
  ];
  const signalTotal = signalWeights.reduce((sum, item) => sum + item.value, 0) || 1;
  const riskRing = Math.max(2, riskScore);
  const confidenceRing = Math.max(2, confidencePct);

  const downloadReport = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const headerHeight = 86;
    const sectionGap = 26;
    const mutedText = [105, 120, 140];
    const inkText = [14, 25, 46];
    const surface = [246, 248, 252];
    const border = [224, 231, 240];
    const accent = ratingTone === "emerald" ? [16, 185, 129] : ratingTone === "amber" ? [245, 158, 11] : [244, 63, 94];

    const temporalLabel = temporalScore !== null && temporalScore !== undefined
      ? temporalScore.toFixed(2)
      : "n/a";

    const drawSectionTitle = (label: string, x: number, y: number) => {
      doc.setFontSize(11);
      doc.setTextColor(...mutedText);
      doc.text(label.toUpperCase(), x, y);
      doc.setTextColor(...inkText);
    };

    const drawCard = (x: number, y: number, w: number, h: number) => {
      doc.setFillColor(...surface);
      doc.setDrawColor(...border);
      doc.roundedRect(x, y, w, h, 10, 10, "FD");
    };

    const drawPill = (label: string, x: number, y: number, bg: number[], color: number[]) => {
      doc.setFillColor(...bg);
      doc.roundedRect(x, y - 14, doc.getTextWidth(label) + 18, 22, 11, 11, "F");
      doc.setFontSize(9);
      doc.setTextColor(...color);
      doc.text(label, x + 9, y);
      doc.setTextColor(...inkText);
    };

    const drawBar = (x: number, y: number, w: number, h: number, value: number, color: number[]) => {
      doc.setFillColor(...border);
      doc.roundedRect(x, y, w, h, 6, 6, "F");
      doc.setFillColor(...color);
      doc.roundedRect(x, y, Math.max(6, w * value), h, 6, 6, "F");
    };

    const drawStackedBar = (x: number, y: number, w: number, h: number, items: Array<{ value: number; color: number[] }>) => {
      doc.setFillColor(...border);
      doc.roundedRect(x, y, w, h, 6, 6, "F");
      let cursor = x;
      items.forEach((item, index) => {
        const segment = (item.value / signalTotal) * w;
        if (segment <= 0) {
          return;
        }
        doc.setFillColor(...item.color);
        const radius = index === 0 || index === items.length - 1 ? 6 : 0;
        doc.roundedRect(cursor, y, segment, h, radius, radius, "F");
        cursor += segment;
      });
    };

    const ensureSpace = (height: number) => {
      if (cursorY + height <= pageHeight - margin) {
        return;
      }
      doc.addPage();
      cursorY = margin;
    };

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...inkText);
    doc.setFillColor(240, 244, 250);
    doc.rect(0, 0, pageWidth, headerHeight, "F");
    doc.setFontSize(20);
    doc.text("VeriRisk Verification Report", margin, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...mutedText);
    doc.text(`Generated ${new Date().toISOString()}`, margin, 62);
    doc.setTextColor(...inkText);

    const verdictLabel = isReal ? "REAL" : "FAKE";
    drawPill(`Verdict: ${verdictLabel}`, pageWidth - margin - 120, 44, accent.map(val => val + 40), accent);

    let cursorY = headerHeight + 24;

    ensureSpace(170);
    drawSectionTitle("Summary", margin, cursorY);
    cursorY += 12;

    drawCard(margin, cursorY, contentWidth, 120);
    doc.setFontSize(13);
    doc.setTextColor(...inkText);
    doc.text("Final Confidence", margin + 18, cursorY + 34);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(`${confidencePct}%`, margin + 18, cursorY + 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...mutedText);
    doc.text("Overall score after fusion", margin + 18, cursorY + 92);
    doc.setTextColor(...inkText);
    drawBar(margin + 220, cursorY + 52, contentWidth - 250, 14, confidencePct / 100, [56, 189, 248]);

    cursorY += 140;
    ensureSpace(170);
    drawCard(margin, cursorY, contentWidth, 120);
    doc.setFontSize(13);
    doc.text("Risk Score", margin + 18, cursorY + 34);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(`${riskScore}/100`, margin + 18, cursorY + 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...mutedText);
    doc.text(`Rating: ${rating}`, margin + 18, cursorY + 92);
    doc.setTextColor(...inkText);
    drawBar(margin + 220, cursorY + 52, contentWidth - 250, 14, riskScore / 100, accent);

    cursorY += 150;
    ensureSpace(220);
    drawSectionTitle("Signals", margin, cursorY);
    cursorY += 12;
    drawCard(margin, cursorY, contentWidth, 170);

    const signalRows = [
      { label: "Spatial Integrity", value: clamp01(1 - spatialScore), color: [56, 189, 248] },
      { label: "Frequency Integrity", value: clamp01(1 - frequencyScore), color: [94, 234, 212] },
      { label: "Temporal Consistency", value: temporalScore !== null && temporalScore !== undefined ? clamp01(1 - temporalScore) : null, color: [167, 139, 250] },
      { label: "Forensic Confidence", value: forensic, color: [34, 197, 94] },
    ];

    let rowY = cursorY + 32;
    signalRows.forEach(row => {
      if (row.value === null) {
        return;
      }
      doc.setFontSize(11);
      doc.setTextColor(...inkText);
      doc.text(row.label, margin + 18, rowY);
      doc.setTextColor(...mutedText);
      doc.text(`${Math.round(row.value * 100)}%`, pageWidth - margin - 40, rowY, { align: "right" });
      drawBar(margin + 18, rowY + 10, contentWidth - 36, 10, row.value, row.color);
      rowY += 32;
    });

    cursorY += 190;
    ensureSpace(140);
    drawSectionTitle("Signal Contribution", margin, cursorY);
    cursorY += 12;
    drawCard(margin, cursorY, contentWidth, 90);
    drawStackedBar(
      margin + 18,
      cursorY + 34,
      contentWidth - 36,
      12,
      [
        { value: spatialScore, color: [56, 189, 248] },
        { value: frequencyScore, color: [94, 234, 212] },
        { value: temporalScore ?? 0, color: [167, 139, 250] },
        { value: submitResult?.flags?.artifact_flag ? 0.65 : 0.15, color: [244, 114, 182] },
        { value: submitResult?.flags?.watermark_detected ? 0.7 : 0.1, color: [248, 113, 113] },
      ]
    );
    doc.setFontSize(9);
    doc.setTextColor(...mutedText);
    doc.text("Weighted blend of signals", margin + 18, cursorY + 60);

    cursorY += 120;
    ensureSpace(180);
    drawSectionTitle("Flags", margin, cursorY);
    cursorY += 12;
    drawCard(margin, cursorY, contentWidth, 120);

    const flagRows = [
      { label: "Artifact flag", active: flags.artifact_flag },
      { label: "Frequency anomaly", active: flags.frequency_anomaly },
      { label: "Temporal inconsistency", active: flags.temporal_inconsistency },
      { label: "Watermark detected", active: flags.watermark_detected },
    ];

    let flagY = cursorY + 34;
    flagRows.forEach(flag => {
      doc.setFontSize(11);
      doc.setTextColor(...inkText);
      doc.text(flag.label, margin + 18, flagY);
      const pillText = flag.active ? "ACTIVE" : "CLEAR";
      const pillColor = flag.active ? [244, 63, 94] : [16, 185, 129];
      const pillBg = flag.active ? [253, 232, 235] : [220, 252, 231];
      drawPill(pillText, pageWidth - margin - 90, flagY + 2, pillBg, pillColor);
      flagY += 26;
    });

    doc.save("veririsk-report.pdf");
  };

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
        <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
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
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                <span
                  className={`h-2 w-2 rounded-full ${
                    ratingTone === "emerald"
                      ? "bg-emerald-400"
                      : ratingTone === "amber"
                        ? "bg-amber-400"
                        : "bg-rose-400"
                  }`}
                ></span>
                {rating}
              </span>
              <span className="text-xs text-muted">
                Reference: {submitResult ? "UPLOAD-RESULT" : "VR-882-X9"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={downloadReport}
              className="btn-secondary px-5 py-3 text-sm"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Download Report
            </button>
            <Link className="btn-primary px-5 py-3 text-sm" href="/upload">
              <span className="material-symbols-outlined text-sm">upload</span>
              New Upload
            </Link>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <article className="surface-card p-8 lg:col-span-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted">
              Overall Status
            </p>
            <div className="mt-4 grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-primary">
                <span
                  className="material-symbols-outlined text-[44px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-tight text-primary">{verdict}</p>
                <p className="mt-1 text-sm text-muted">
                  AI forensic checks completed with a final confidence score.
                </p>
                <div className="mt-4 rounded-xl border border-muted/40 bg-[var(--surface-muted)] p-4">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    <span>Final Confidence</span>
                    <span className="text-primary">{confidencePct}%</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-[var(--text)]"
                      style={{ width: `${Math.max(4, confidencePct)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="surface-card flex flex-col justify-between gap-6 p-8 lg:col-span-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-muted">
                Final Risk Score
              </p>
              <p className="mt-2 text-5xl font-semibold tracking-tight text-primary">
                {riskScore}
                <span className="text-2xl text-muted">/100</span>
              </p>
            </div>
            <div className="rounded-xl border border-muted/40 bg-[var(--surface-muted)] p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted">Rating</span>
                <span
                  className={`uppercase tracking-widest ${
                    ratingTone === "emerald"
                      ? "text-emerald-400"
                      : ratingTone === "amber"
                        ? "text-amber-400"
                        : "text-rose-400"
                  }`}
                >
                  {rating}
                </span>
              </div>
              <div className="flex items-center justify-center">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(${ratingTone === "emerald" ? "#34d399" : ratingTone === "amber" ? "#fbbf24" : "#fb7185"} ${Math.max(4, riskScore)}%, rgba(15, 23, 42, 0.35) 0)`,
                  }}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface)] text-xs font-semibold text-primary">
                    {riskScore}%
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-muted/40 bg-[var(--surface-muted)] p-4 text-xs text-muted">
              Confidence: {confidencePct}% • Result: {isReal ? "REAL" : "FAKE"}
            </div>
          </article>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <article className="surface-card p-8 lg:col-span-7">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-primary">
                Analysis Breakdown
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Signals
              </span>
            </div>
            <div className="space-y-5">
              {metrics.map(metric => (
                <div key={metric.label}>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">{metric.icon}</span>
                      <span>{metric.label}</span>
                    </div>
                    <span className="text-primary">{percent(metric.value)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-[var(--text)]"
                      style={{ width: `${Math.max(4, Math.round(metric.value * 100))}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card p-8 lg:col-span-5">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-primary">
                Flags & Indicators
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Alerts
              </span>
            </div>
            <div className="grid gap-3">
              {[
                { label: "Artifact Flag", active: flags.artifact_flag },
                { label: "Frequency Anomaly", active: flags.frequency_anomaly },
                { label: "Temporal Inconsistency", active: flags.temporal_inconsistency },
                { label: "Watermark Detected", active: flags.watermark_detected },
              ].map(flag => (
                <div
                  key={flag.label}
                  className="flex items-center justify-between rounded-xl border border-muted/40 bg-[var(--surface-muted)] px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-primary">{flag.label}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                      flag.active
                        ? "bg-rose-500/20 text-rose-200"
                        : "bg-emerald-500/20 text-emerald-200"
                    }`}
                  >
                    {flag.active ? "Active" : "Clear"}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <article className="surface-card p-8 lg:col-span-5">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-primary">
                Risk Rings
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Charts
              </span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-muted/40 bg-[var(--surface-muted)] p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Risk Score
                </p>
                <div
                  className="mx-auto mt-4 flex h-28 w-28 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(${ratingTone === "emerald" ? "#34d399" : ratingTone === "amber" ? "#fbbf24" : "#fb7185"} ${riskRing}%, rgba(15, 23, 42, 0.35) 0)`,
                  }}
                >
                  <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--surface)] text-xl font-semibold text-primary">
                    {riskScore}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-muted/40 bg-[var(--surface-muted)] p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Confidence
                </p>
                <div
                  className="mx-auto mt-4 flex h-28 w-28 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#38bdf8 ${confidenceRing}%, rgba(15, 23, 42, 0.35) 0)`,
                  }}
                >
                  <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--surface)] text-xl font-semibold text-primary">
                    {confidencePct}%
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="surface-card p-8 lg:col-span-7">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-primary">
                Signal Contribution
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Composition
              </span>
            </div>
            <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-border">
              <div className="flex h-full w-full">
                {signalWeights.map(item => (
                  <div
                    key={item.label}
                    className="h-full"
                    style={{ width: `${(item.value / signalTotal) * 100}%`, backgroundColor: "#38bdf8" }}
                  ></div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {signalWeights.map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{item.label}</span>
                  <span className="font-semibold text-primary">
                    {Math.round((item.value / signalTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="surface-card p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-primary">
              Decision Timeline
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Audit
            </span>
          </div>
          <div className="space-y-5 text-sm text-primary">
            <div className="flex items-start gap-4">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400"></span>
              <div>
                <p className="font-semibold">Final verdict issued</p>
                <p className="text-muted">
                  Confidence score met acceptance threshold and no critical flags
                  were detected.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="mt-1 h-2 w-2 rounded-full bg-sky-400"></span>
              <div>
                <p className="font-semibold">Signal fusion complete</p>
                <p className="text-muted">
                  Spatial, frequency, temporal, and artifact checks aggregated
                  into final risk score.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="mt-1 h-2 w-2 rounded-full bg-amber-400"></span>
              <div>
                <p className="font-semibold">Media analysis completed</p>
                <p className="text-muted">
                  Frame sampling and quality checks passed for the uploaded file.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link className="btn-secondary px-6 py-3 text-sm" href="/upload">
            Re-run Verification
          </Link>
          <Link className="btn-primary px-6 py-3 text-sm" href="/">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
