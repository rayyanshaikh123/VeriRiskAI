import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

function ProcessingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate("/results");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="processing-background flex min-h-screen items-center justify-center px-6 text-[#0b1c30]">
      <section className="w-full max-w-2xl rounded-[2rem] bg-white p-10 text-center shadow-2xl shadow-slate-900/5">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#6ffbbe]/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#005236]">
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>sync</span>
          Processing
        </p>
        <h1 className="mt-5 text-4xl font-black tracking-[-0.02em]">Analyzing Uploaded Video</h1>
        <p className="mt-3 text-sm text-[#45464d]">Face matching and forensic checks are running. You will be redirected to verification results automatically.</p>

        <div className="mt-8 flex justify-center">
          <div aria-label="Loading" className="loader"></div>
        </div>

        <div className="mt-8 rounded-xl bg-[#eff4ff] px-4 py-3 text-xs text-[#45464d]">
          Secure pipeline active: biometric extraction, liveness scoring, and anomaly checks in progress.
        </div>

        <Link className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white" to="/results">
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
          View Results Now
        </Link>
      </section>
    </main>
  );
}

export default ProcessingPage;
