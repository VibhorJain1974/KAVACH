import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAVACH — India's Space Weather Shield",
  description: "Autonomous space weather intelligence. It called the farmer before the lights went out.",
  openGraph: {
    title: "KAVACH",
    description: "Autonomous space weather shield for India's 1.4 billion",
    siteName: "KAVACH",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
