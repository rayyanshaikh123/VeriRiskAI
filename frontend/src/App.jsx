import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import UploadPage from "./pages/UploadPage";
import ProcessingPage from "./pages/ProcessingPage";
import ResultsPage from "./pages/ResultsPage";

function HashScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace("#", "");
    let attempts = 0;

    const scroll = () => {
      const target = document.getElementById(id);
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        return;
      }

      if (attempts < 12) {
        attempts += 1;
        requestAnimationFrame(scroll);
      }
    };

    requestAnimationFrame(scroll);
  }, [location.pathname, location.hash]);

  return null;
}

function App() {
  return (
    <>
      <HashScrollManager />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/processing" element={<ProcessingPage />} />
        <Route path="/results" element={<ResultsPage />} />

        <Route path="/index.html" element={<Navigate replace to="/" />} />
        <Route path="/veririsk_ai_id_upload/id-upload-step.html" element={<Navigate replace to="/upload" />} />
        <Route path="/veririsk_ai_processing/verification-processing.html" element={<Navigate replace to="/processing" />} />
        <Route path="/veririsk_ai_verification_results/verification-results.html" element={<Navigate replace to="/results" />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </>
  );
}

export default App;
