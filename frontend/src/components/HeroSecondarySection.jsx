import { Link } from "react-router-dom";

function HeroSecondarySection() {
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 pb-12 md:px-8 lg:grid-cols-12" id="hero-components">
      <div className="lg:col-span-5">
        <div className="rounded-[2rem] bg-[#eff4ff] p-4 shadow-2xl shadow-[#0b1c30]/5">
          <div className="rounded-[1.5rem] bg-white p-6">
            <p className="mb-5 text-xs font-black uppercase tracking-widest text-[#45464d]">Debug Entry</p>
            <div className="space-y-3 text-sm">
              <Link className="block rounded-xl bg-[#dce9ff] p-3 font-semibold" to="/upload">Open Upload Step</Link>
              <Link className="block rounded-xl bg-[#dce9ff] p-3 font-semibold" to="/processing">Open Processing Step</Link>
              <Link className="block rounded-xl bg-[#dce9ff] p-3 font-semibold" to="/results">Open Results Step</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-dashed border-[#c6c6cd] bg-[#eff4ff] p-6">
            <p className="text-xs font-black uppercase tracking-widest text-[#45464d]">Hero Slot A</p>
            <h3 className="mt-3 text-xl font-black tracking-tight text-[#0b1c30]">Custom Component Area</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#45464d]">Replace this block with any module you want to show beside the main hero.</p>
          </article>
          <article className="rounded-3xl border border-dashed border-[#c6c6cd] bg-[#eff4ff] p-6">
            <p className="text-xs font-black uppercase tracking-widest text-[#45464d]">Hero Slot B</p>
            <h3 className="mt-3 text-xl font-black tracking-tight text-[#0b1c30]">Second Component Area</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#45464d]">Use this space for stats, highlights, testimonials, or onboarding shortcuts.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

export default HeroSecondarySection;
