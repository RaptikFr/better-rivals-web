"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import announcement from "@/content/announcement";

const STORAGE_KEY = "better-rivals:banner-dismissed";

const typeStyles = {
  info: {
    wrapper: "bg-pink-500/10 border-pink-500/20 text-pink-200",
    dot: "bg-pink-500",
    link: "bg-pink-500 hover:bg-pink-600 text-white",
    close: "text-pink-400 hover:text-pink-200 hover:bg-pink-500/20",
  },
  success: {
    wrapper: "bg-green-500/10 border-green-500/20 text-green-200",
    dot: "bg-green-400",
    link: "bg-green-500 hover:bg-green-600 text-white",
    close: "text-green-400 hover:text-green-200 hover:bg-green-500/20",
  },
  warning: {
    wrapper: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    dot: "bg-amber-400",
    link: "bg-amber-500 hover:bg-amber-600 text-white",
    close: "text-amber-400 hover:text-amber-200 hover:bg-amber-500/20",
  },
};

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!announcement.active) return;
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation localStorage au montage (pattern établi du projet)
      if (dismissed !== announcement.id) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, announcement.id);
    } catch {}
  }

  if (!visible) return null;

  const styles = typeStyles[announcement.type];

  return (
    <div
      className={`relative z-40 w-full border-b px-4 py-2 text-sm ${styles.wrapper}`}
      role="banner"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        {/* Dot animé */}
        <span
          className={`hidden sm:block h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`}
          aria-hidden="true"
        />

        {/* Message */}
        <p className="min-w-0 flex-1 leading-snug">
          {announcement.message}
        </p>

        {/* Lien optionnel */}
        {announcement.link && announcement.linkLabel && (
          <Link
            href={announcement.link}
            className={`hidden sm:inline-flex shrink-0 items-center rounded-md px-3 py-1 text-xs font-semibold transition-colors ${styles.link}`}
          >
            {announcement.linkLabel}
          </Link>
        )}

        {/* Bouton fermer */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer l'annonce"
          className={`shrink-0 rounded p-1 transition-colors ${styles.close}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
        </button>
      </div>

      {/* Lien mobile (sous le message) */}
      {announcement.link && announcement.linkLabel && (
        <div className="mx-auto mt-1 max-w-7xl sm:hidden">
          <Link
            href={announcement.link}
            className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold transition-colors ${styles.link}`}
          >
            {announcement.linkLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
