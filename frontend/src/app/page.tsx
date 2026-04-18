import Link from "next/link";

export default function HomePage() {
  return (
    <div className="hero-background min-h-screen text-on-surface antialiased">
      <header className="glass fixed top-0 z-50 w-full bg-white/80 shadow-sm shadow-slate-200/60">
        <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-6 md:px-8">
          <div className="text-lg font-black tracking-tighter text-slate-950">
            VeriRisk HR
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              className="border-b-2 border-black pb-1 text-sm font-semibold text-slate-950"
              href="#hero-primary"
            >
              Home
            </a>
            <a
              className="text-sm text-slate-500 transition-colors hover:text-slate-800"
              href="#quick-start"
            >
              Quick Start
            </a>
            <a
              className="text-sm text-slate-500 transition-colors hover:text-slate-800"
              href="#security"
            >
              Security
            </a>
          </nav>
          <Link
            className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            href="/upload"
          >
            Upload Video
          </Link>
        </div>
      </header>

      <main className="pt-24 md:pt-28">
        <section className="mx-auto max-w-7xl px-6 pb-8 md:px-8" id="hero-primary">
          <div className="rounded-[2rem] bg-[#eff4ff] p-8 md:p-12">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#6ffbbe] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#005236]">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              HR Trust Engine
            </p>
            <h1 className="mb-5 text-5xl font-black leading-[1.05] tracking-[-0.02em] text-[#0b1c30] md:text-7xl">
              Human Resources,
              <br />
              Secured Like Finance.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#45464d] md:text-lg">
              Centralize recruitment identity checks, onboarding authenticity,
              and employee records validation in one enterprise command center.
              Built for high-compliance organizations that need speed without
              compromise.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-xl bg-gradient-to-r from-black to-[#131b2e] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#0b1c30]/10 transition-transform hover:-translate-y-0.5"
                href="/upload"
              >
                Step 1: Go To Upload
              </Link>
              <a
                className="rounded-xl bg-[#d3e4fe] px-6 py-3 text-sm font-bold text-[#57657b] transition-colors hover:bg-[#dce9ff]"
                href="#quick-start"
              >
                Flow Details
              </a>
            </div>
          </div>
        </section>

        <section
          className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 pb-12 md:px-8 lg:grid-cols-12"
          id="hero-components"
        >
          <div className="lg:col-span-5">
            <div className="rounded-[2rem] bg-[#eff4ff] p-4 shadow-2xl shadow-[#0b1c30]/5">
              <div className="rounded-[1.5rem] bg-white p-6">
                <p className="mb-5 text-xs font-black uppercase tracking-widest text-[#45464d]">
                  Debug Entry
                </p>
                <div className="space-y-3 text-sm">
                  <Link
                    className="block rounded-xl bg-[#dce9ff] p-3 font-semibold"
                    href="/upload"
                  >
                    Open Upload Step
                  </Link>
                  <Link
                    className="block rounded-xl bg-[#dce9ff] p-3 font-semibold"
                    href="/processing"
                  >
                    Open Processing Step
                  </Link>
                  <Link
                    className="block rounded-xl bg-[#dce9ff] p-3 font-semibold"
                    href="/results"
                  >
                    Open Results Step
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <article className="rounded-3xl border border-dashed border-[#c6c6cd] bg-[#eff4ff] p-6">
                <p className="text-xs font-black uppercase tracking-widest text-[#45464d]">
                  Hero Slot A
                </p>
                <h3 className="mt-3 text-xl font-black tracking-tight text-[#0b1c30]">
                  Custom Component Area
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#45464d]">
                  Replace this block with any module you want to show beside the
                  main hero.
                </p>
              </article>
              <article className="rounded-3xl border border-dashed border-[#c6c6cd] bg-[#eff4ff] p-6">
                <p className="text-xs font-black uppercase tracking-widest text-[#45464d]">
                  Hero Slot B
                </p>
                <h3 className="mt-3 text-xl font-black tracking-tight text-[#0b1c30]">
                  Second Component Area
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#45464d]">
                  Use this space for stats, highlights, testimonials, or
                  onboarding shortcuts.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10 md:px-8" id="quick-start">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-black tracking-tight text-[#0b1c30] md:text-4xl">
              Verification Flow
            </h2>
            <span className="text-xs font-bold uppercase tracking-widest text-[#45464d]">
              Simple Sequence
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-3xl bg-[#eff4ff] p-6">
              <span className="material-symbols-outlined mb-4 text-[#45464d]">
                upload_file
              </span>
              <h3 className="text-xl font-bold">1. Upload Video</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#45464d]">
                Start by uploading the verification video in the upload step.
              </p>
            </article>
            <article className="rounded-3xl bg-[#eff4ff] p-6">
              <span className="material-symbols-outlined mb-4 text-[#45464d]">
                autorenew
              </span>
              <h3 className="text-xl font-bold">2. Processing</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#45464d]">
                The system runs liveness and forensic checks on the uploaded
                media.
              </p>
            </article>
            <article className="rounded-3xl bg-[#eff4ff] p-6">
              <span className="material-symbols-outlined mb-4 text-[#45464d]">
                task_alt
              </span>
              <h3 className="text-xl font-bold">3. Results</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#45464d]">
                Once complete, the verification result page is shown
                automatically.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="mx-auto mt-8 max-w-7xl px-6 pb-10 md:px-8" id="security">
        <div className="flex flex-col gap-4 rounded-2xl bg-[#cbdbf5] px-6 py-4 text-xs text-[#45464d] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black tracking-widest text-[#0b1c30]">
              VERIRISK HR SECURE CORE
            </span>
            <span className="h-1 w-1 rounded-full bg-[#45464d]"></span>
            <span>SOC2 and ISO 27001 aligned processing</span>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 font-bold text-white"
            href="/upload"
          >
            <span className="material-symbols-outlined text-sm">play_arrow</span>
            Start Upload
          </Link>
        </div>
      </footer>
    </div>
  );
}
