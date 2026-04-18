import { Link } from "react-router-dom";
import ColorBends from "../../components/ColorBends";

function HeroPrimarySection() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-8 md:px-8" id="hero-primary">
      <div className="hero-primary-shell relative overflow-hidden rounded-[2rem] p-8 md:p-12">
        <ColorBends
          className="hero-primary-canvas absolute inset-0"
          colors={["#0f1e45", "#1f4ecf", "#0ea5e9", "#6ee7ff", "#dbeafe"]}
          intensity={1.35}
          speed={0.26}
          scale={0.85}
          noise={0.04}
          frequency={1.02}
          warpStrength={1.35}
          mouseInfluence={0.5}
          parallax={0.4}
          iterations={2}
          bandWidth={9}
          autoRotate={4}
          transparent={false}
        />
        <div className="hero-primary-overlay pointer-events-none absolute inset-0" />
        <div className="relative z-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#6ffbbe] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#005236]">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            AI Deepfake Defense
          </p>
          <h1 className="mb-5 text-5xl font-black leading-[1.05] tracking-[-0.02em] text-[#0b1c30] md:text-7xl">
            Know Who's Real.
            <br />
            Instantly.
          </h1>
          <p className="max-w-2xl text-base font-medium leading-relaxed text-[#3d4f6a] md:text-lg">
            Advanced AI detection for secure identity verification across HR and fintech systems.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-xl bg-gradient-to-r from-black to-[#131b2e] px-7 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(12,34,63,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(12,34,63,0.35)]" to="/upload">
              Start Verification
            </Link>
            <a className="rounded-xl border border-[#bed2f5] bg-[#e6efff] px-7 py-3 text-sm font-bold text-[#324766] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#f0f5ff]" href="#quick-start">
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroPrimarySection;
