import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./arena.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://axelrod-arena.myudak.chatgpt.site"),
  title: {
    default: "Axelrod Arena",
    template: "%s · Axelrod Arena",
  },
  description:
    "Play, replay, and simulate the Iterated Prisoner's Dilemma with ten classic Axelrod strategies.",
  openGraph: {
    title: "Axelrod Arena",
    description:
      "Can cooperation survive? Enter an interactive Iterated Prisoner's Dilemma tournament.",
    type: "website",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Axelrod Arena",
    description:
      "Can cooperation survive? Enter an interactive Iterated Prisoner's Dilemma tournament.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-atari">
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <span>AXELROD ARENA · CLASSIC BUILD 01</span>
          <span>COOPERATE / DEFECT / REPEAT</span>
        </footer>
      </body>
    </html>
  );
}
