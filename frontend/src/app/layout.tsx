import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";

const poppins = Poppins({ subsets: ["latin"], variable: "--font-sans", weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "VeriRisk AI | KYC Flow",
  description: "Secure identity verification workflow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans dark", poppins.variable)}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
