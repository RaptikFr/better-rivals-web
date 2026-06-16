import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Providers } from "./providers";
import { siteUrl } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    url: siteUrl,
    siteName: "Better Rivals FH6",
    locale: "fr_FR",
    type: "website",
    images: [{ url: '/og-image.jpg', width: 1280, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Better Rivals",
    description:
      "Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6.",
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon_16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_32x32.png', sizes: '32x32', type: 'image/png' },
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
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
        <Providers>
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
