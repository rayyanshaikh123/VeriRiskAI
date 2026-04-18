import { Link } from "react-router-dom";

function UploadPage() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] antialiased">
      <header className="fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-center px-6 md:px-8">
          <nav className="master-pill-nav" aria-label="Primary navigation">
            <Link className="master-pill-item" to="/">Home</Link>
            <Link className="master-pill-item" to="/#quick-start">Quick Start</Link>
            <Link className="master-pill-item master-pill-upload is-active" to="/upload">Upload</Link>
          </nav>
        </div>
      </header>

      <main className="px-6 pb-12 pt-24 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-12">
            <h1 className="mb-4 text-[3.5rem] font-bold leading-[1.1] tracking-tight text-black">Video Upload Step.</h1>
            <p className="max-w-xl text-lg text-[#45464d]">Upload your verification video to start analysis. After upload, processing will begin before results are shown.</p>
          </header>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-8">
              <div className="flex items-center justify-between rounded-full bg-[#eff4ff] p-2">
                <div className="flex flex-1 items-center space-x-1 px-4">
                  <div className="h-2 w-full rounded-full bg-black"></div>
                  <div className="h-2 w-full rounded-full bg-[#bec6e0]"></div>
                  <div className="h-2 w-full rounded-full bg-[#bec6e0]"></div>
                </div>
                <span className="whitespace-nowrap border-l border-[#c6c6cd]/30 px-6 text-xs font-bold uppercase tracking-widest text-[#45464d]">Step 01 / 03</span>
              </div>

              <div className="group relative flex flex-col items-center justify-center space-y-6 overflow-hidden rounded-[2rem] border-2 border-dashed border-[#bec6e0] bg-white p-12 text-center transition-all duration-300 hover:border-black">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#dce9ff] transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-4xl text-black">cloud_upload</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Upload Verification Video</h3>
                  <p className="mx-auto max-w-sm text-[#45464d]">Drag and drop your verification video here, or browse your files.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <button className="rounded-xl bg-black px-8 py-3 font-bold text-white">Upload Video</button>
                  <button className="rounded-xl bg-[#d3e4fe] px-8 py-3 font-bold text-[#57657b]">Record Video</button>
                </div>
                <p className="mt-4 text-xs font-medium tracking-tight text-[#45464d]">Accepted formats: MP4, MOV, WEBM (Max 100MB)</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link className="flex items-center space-x-2 px-4 py-2 font-bold text-[#45464d] transition-colors hover:text-black" to="/">
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span>Back to Landing</span>
                </Link>
                <Link className="group flex items-center space-x-4 rounded-xl bg-black px-8 py-4 text-lg font-bold text-white" to="/processing">
                  <span>Continue to Processing</span>
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                </Link>
              </div>
            </div>

            <div className="space-y-8 lg:col-span-4">
              <div className="rounded-[2rem] border border-white/40 bg-[#dce9ff]/50 p-8">
                <h4 className="mb-6 flex items-center text-lg font-black">
                  <span className="material-symbols-outlined mr-2 text-black">verified_user</span>
                  Quality Guidelines
                </h4>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6ffbbe]">
                      <span className="material-symbols-outlined text-sm text-[#005236]">light_mode</span>
                    </div>
                    <div>
                      <h5 className="mb-1 text-sm font-bold">Avoid Direct Glare</h5>
                      <p className="text-xs leading-relaxed text-[#45464d]">Ensure lighting is uniform. Reflections on laminated surfaces can obscure data points.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6ffbbe]">
                      <span className="material-symbols-outlined text-sm text-[#005236]">crop_free</span>
                    </div>
                    <div>
                      <h5 className="mb-1 text-sm font-bold">Capture All Corners</h5>
                      <p className="text-xs leading-relaxed text-[#45464d]">The entire document must be visible within the frame to confirm physical authenticity.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6ffbbe]">
                      <span className="material-symbols-outlined text-sm text-[#005236]">visibility</span>
                    </div>
                    <div>
                      <h5 className="mb-1 text-sm font-bold">High Resolution</h5>
                      <p className="text-xs leading-relaxed text-[#45464d]">Text must be sharp and legible. Avoid blurry captures or low-light conditions.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 rounded-full border border-[#c6c6cd]/20 bg-[#eff4ff] p-6">
                <span className="material-symbols-outlined text-3xl text-[#bec6e0]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
                <div>
                  <p className="text-xs font-bold">End-to-End Encryption</p>
                  <p className="text-[10px] text-[#45464d]">AES-256 Bit Security Protocols</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UploadPage;
