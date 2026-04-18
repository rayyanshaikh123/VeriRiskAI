"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KycChallengePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/kyc/submit");
  }, [router]);

  return null;
}
