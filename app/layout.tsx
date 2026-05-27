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
    default: "Better Rivals FH6",
    template: "%s | Better Rivals",
  },
  description:
    "Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6. Battez-vous à armes égales.",
  keywords: ["Forza Horizon 6", "classement", "leaderboard", "temps au tour", "télémétrie", "EventLab"],
  openGraph: {
    title: "Better Rivals",
    description:
      "Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6.",
    url: "https://better-rivals-fh6.vercel.app",
    siteName: "Better Rivals FH6",
    locale: "fr_FR",
    type: "website",
    images: [{ url: '/og-image.png', width: 1280, height: 480 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Better Rivals",
    description:
      "Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6.",
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon_16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_512.png',   sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
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
