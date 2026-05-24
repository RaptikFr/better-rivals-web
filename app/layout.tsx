import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Better Rivals",
    template: "%s | Better Rivals",
  },
  description:
    "Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6. Battez-vous à armes égales.",
  keywords: ["Forza Horizon 6", "classement", "leaderboard", "temps au tour", "télémétrie", "EventLab"],
  openGraph: {
    title: "Better Rivals",
    description:
      "Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6.",
    url: "https://better-rivals.vercel.app",
    siteName: "Better Rivals",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Better Rivals",
    description:
      "Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-white">
        <Navbar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
