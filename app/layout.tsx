import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PPTgeni — Hackathon presentation studio",
  description: "Turn a rough idea into an editable, presentation-ready deck."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
