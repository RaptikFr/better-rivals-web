"use client";

import { pagesAffichees } from '@/lib/pagination';

const BOUTON_NAV = 'px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all';

export default function Pagination({ page, totalPages, onChange }: {
  page:       number;
  totalPages: number;
  onChange:   (page: number) => void;
}) {
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 mt-6">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className={BOUTON_NAV}>
        ← Précédent
      </button>

      <div className="flex gap-1">
        {pagesAffichees(page, totalPages).map((item, i) =>
          item === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 py-2 text-neutral-500 dark:text-neutral-600 text-sm">…</span>
          ) : (
            <button
              key={item}
              onClick={() => onChange(item)}
              aria-current={page === item ? 'page' : undefined}
              className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                page === item
                  ? 'bg-pink-500 text-white border border-pink-500'
                  : 'border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-500'
              }`}
            >
              {item}
            </button>
          )
        )}
      </div>

      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={BOUTON_NAV}>
        Suivant →
      </button>
    </nav>
  );
}
