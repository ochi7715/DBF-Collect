import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABS Connect",
  description: "Phase 1 patient portal for intake documents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
