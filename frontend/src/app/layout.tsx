import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
