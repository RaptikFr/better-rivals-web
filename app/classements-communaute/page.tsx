import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Classements — Épreuves communauté",
  description: "Classements des temps réalisés sur les épreuves de la communauté Better Rivals.",
};

export default function ClassementsCommunautePage() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
          Classements — Épreuves communauté
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-lg">
          Bientôt disponible.
        </p>
      </div>
    </main>
  );
}
