import { Link } from "react-router-dom";
import HeroPrimarySection from "../components/HeroPrimarySection";
import BorderGlow from "../../components/BorderGlow";

function LandingPage() {

  return (
    <div className="hero-background min-h-screen text-on-surface antialiased">
      <header className="fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-center px-6 md:px-8">
          <nav className="master-pill-nav" aria-label="Primary navigation">
            <a className="master-pill-item is-active" href="#hero-primary">Home</a>
            <a className="master-pill-item" href="#quick-start">Quick Start</a>
            <Link className="master-pill-item master-pill-upload" to="/upload">Upload</Link>
          </nav>
        </div>
      </header>

      <main className="pt-24 md:pt-28">
        <HeroPrimarySection />

        <section className="mx-auto max-w-[96rem] px-6 py-16 md:px-8 md:py-20" id="features">
          <div className="mb-10">
            <h2 className="text-4xl font-black tracking-tight text-[#0b1c30] md:text-5xl">Core Detection Capabilities</h2>
            <p className="mt-4 max-w-4xl text-lg leading-relaxed text-[#45464d] md:text-xl">
              Multi-layer AI analysis designed to identify synthetic media and ensure identity authenticity.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <article className="min-h-[290px] rounded-3xl bg-[#eff4ff] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 text-[36px] text-[#45464d]">texture</span>
              <h3 className="text-2xl font-bold text-[#0b1c30]">Spatial Artifact Detection</h3>
              <p className="mt-3 max-w-[36ch] text-base leading-relaxed text-[#45464d] md:text-[1.06rem]">Identifies visual inconsistencies such as unnatural textures, blending errors, and facial distortions.</p>
            </article>

            <article className="min-h-[290px] rounded-3xl bg-[#eff4ff] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 text-[36px] text-[#45464d]">equalizer</span>
              <h3 className="text-2xl font-bold text-[#0b1c30]">Frequency Analysis</h3>
              <p className="mt-3 max-w-[36ch] text-base leading-relaxed text-[#45464d] md:text-[1.06rem]">Analyzes hidden patterns in frequency space to detect synthetic generation artifacts.</p>
            </article>

            <article className="min-h-[290px] rounded-3xl bg-[#eff4ff] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 text-[36px] text-[#45464d]">movie</span>
              <h3 className="text-2xl font-bold text-[#0b1c30]">Temporal Consistency</h3>
              <p className="mt-3 max-w-[36ch] text-base leading-relaxed text-[#45464d] md:text-[1.06rem]">Evaluates frame-to-frame continuity to detect unnatural motion and deepfake instability.</p>
            </article>

            <article className="min-h-[290px] rounded-3xl bg-[#eff4ff] p-8 md:p-9">
              <span className="material-symbols-outlined mb-5 text-[36px] text-[#45464d]">face_retouching_natural</span>
              <h3 className="text-2xl font-bold text-[#0b1c30]">Liveness Verification</h3>
              <p className="mt-3 max-w-[36ch] text-base leading-relaxed text-[#45464d] md:text-[1.06rem]">Detects real human signals like blinking and micro-expressions to prevent spoofing.</p>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-[96rem] px-6 py-14 md:px-8" id="quick-start">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black tracking-tight text-[#0b1c30] md:text-5xl">How It Works</h2>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#45464d] md:text-lg">
                A streamlined, multi-step pipeline that verifies identity authenticity using advanced AI analysis.
              </p>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#45464d]">Simple Sequence</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <BorderGlow
              backgroundColor="#eaf1ff"
              borderRadius={24}
              glowRadius={30}
              glowColor="210 96 76"
              glowIntensity={0.95}
              edgeSensitivity={28}
              coneSpread={24}
              fillOpacity={0.35}
              colors={["#7dd3fc", "#93c5fd", "#a5b4fc"]}
            >
              <article className="min-h-[260px] rounded-[24px] bg-[#eff4ff]/95 p-8 md:p-9">
                <span className="material-symbols-outlined mb-5 text-[34px] text-[#45464d]">upload_file</span>
                <h3 className="text-[2rem] font-black leading-tight text-[#0b1c30]">1. Upload Media</h3>
                <p className="mt-3 max-w-[34ch] text-[1.15rem] leading-relaxed text-[#45464d]">Submit a selfie image or short video for identity verification. The system securely processes supported formats in real time.</p>
              </article>
            </BorderGlow>
            <BorderGlow
              backgroundColor="#eaf1ff"
              borderRadius={24}
              glowRadius={30}
              glowColor="190 90 76"
              glowIntensity={0.95}
              edgeSensitivity={28}
              coneSpread={24}
              fillOpacity={0.35}
              colors={["#67e8f9", "#38bdf8", "#93c5fd"]}
            >
              <article className="min-h-[260px] rounded-[24px] bg-[#eff4ff]/95 p-8 md:p-9">
                <span className="material-symbols-outlined mb-5 text-[34px] text-[#45464d]">autorenew</span>
                <h3 className="text-[2rem] font-black leading-tight text-[#0b1c30]">2. AI Analysis</h3>
                <p className="mt-3 max-w-[34ch] text-[1.15rem] leading-relaxed text-[#45464d]">Multiple AI models analyze spatial artifacts, frequency patterns, and temporal consistency to detect synthetic manipulation.</p>
              </article>
            </BorderGlow>
            <BorderGlow
              backgroundColor="#eaf1ff"
              borderRadius={24}
              glowRadius={30}
              glowColor="220 92 78"
              glowIntensity={0.95}
              edgeSensitivity={28}
              coneSpread={24}
              fillOpacity={0.35}
              colors={["#a5b4fc", "#93c5fd", "#7dd3fc"]}
            >
              <article className="min-h-[260px] rounded-[24px] bg-[#eff4ff]/95 p-8 md:p-9">
                <span className="material-symbols-outlined mb-5 text-[34px] text-[#45464d]">task_alt</span>
                <h3 className="text-[2rem] font-black leading-tight text-[#0b1c30]">3. Verification Result</h3>
                <p className="mt-3 max-w-[34ch] text-[1.15rem] leading-relaxed text-[#45464d]">Receive a clear authenticity decision with confidence score and detection insights for informed action.</p>
              </article>
            </BorderGlow>
          </div>
        </section>
      </main>

      <footer className="mx-auto mt-10 max-w-[96rem] px-6 pb-10 md:px-8" id="security">
        <div className="rounded-2xl bg-[#eff4ff]/80 px-6 py-8 md:px-8 md:py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-start">
            <div>
              <p className="text-lg font-black tracking-tight text-[#0b1c30]">VeriRisk AI</p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#45464d]">AI-powered deepfake detection for secure identity verification.</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#45464d]">Navigation</p>
              <div className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#0b1c30]">
                <a className="transition-opacity hover:opacity-80" href="#hero-primary">Home</a>
                <Link className="transition-opacity hover:opacity-80" to="/upload">Upload</Link>
                <a className="transition-opacity hover:opacity-80" href="#quick-start">Verification Flow</a>
                <a className="transition-opacity hover:opacity-80" href="#features">Features</a>
              </div>
            </div>

            <div className="md:text-right">
              <p className="text-sm font-semibold text-[#0b1c30]">Built for HR & Fintech Systems</p>
              <span className="mt-3 inline-flex rounded-full bg-[#dce9ff] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#45464d]">
                Secure • Compliant • Real-time
              </span>
            </div>
          </div>

          <div className="mt-8 border-t border-[#c6c6cd]/45 pt-4 text-xs text-[#45464d]/85">
            © 2026 VeriRisk AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
