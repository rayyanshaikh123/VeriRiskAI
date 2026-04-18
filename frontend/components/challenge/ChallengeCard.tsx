"use client";

import type { ChallengePrompt } from "@/types/api";

const iconByType: Record<ChallengePrompt["type"], string> = {
  blink: "visibility",
  head_turn: "360",
  smile: "sentiment_satisfied",
  number: "numbers",
};

function buildPromptText(challenge: ChallengePrompt): string {
  switch (challenge.type) {
    case "blink":
      return "Blink twice to continue.";
    case "head_turn":
      return "Turn your head left and right.";
    case "smile":
      return "Smile gently for the camera.";
    case "number":
      return `Speak the number ${challenge.value}.`;
    default:
      return "Complete the on-screen prompt.";
  }
}

export default function ChallengeCard({
  challenge,
  passed,
}: {
  challenge: ChallengePrompt | null;
  passed: boolean;
}) {
  if (!challenge) {
    return (
      <div className="rounded-3xl border border-dashed border-[#c6c6cd] bg-white p-6 text-sm text-[#45464d]">
        No challenge prompt yet. Return to capture to collect more frames.
      </div>
    );
  }

  const expiresAt = new Date(challenge.expires_at);
  const expiresLabel = Number.isNaN(expiresAt.getTime())
    ? "--"
    : expiresAt.toLocaleTimeString();

  return (
    <div className="rounded-3xl bg-[#eff4ff] p-6">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[#45464d]">
        <span>Live Challenge</span>
        <span className={passed ? "text-[#2f9a6b]" : "text-[#b06a00]"}>
          {passed ? "Passed" : "Pending"}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="material-symbols-outlined text-3xl text-[#45464d]">
          {iconByType[challenge.type]}
        </span>
        <div>
          <h3 className="text-lg font-bold text-[#0b1c30]">
            {buildPromptText(challenge)}
          </h3>
          <p className="text-xs text-[#45464d]">Expires at {expiresLabel}</p>
        </div>
      </div>
    </div>
  );
}
