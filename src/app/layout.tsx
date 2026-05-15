import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dragon Boat Docs",
  description: "Dragon boat race registration and waiver portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
