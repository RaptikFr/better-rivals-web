"use client";

import Link from 'next/link';

const CRITERES = [
  {
    icon: '🔄',
    titre: 'Au moins 3 tours configurés',
    obligatoire: true,
    description:
      "Les paramètres de l'épreuve EventLab doivent prévoir au minimum 3 tours. Le premier tour sert souvent à prendre en main le circuit et est rarement représentatif. Avec 3 tours ou plus, chaque pilote a la possibilité de réaliser au moins un tour propre pour établir son meilleur chrono.",
    exemple: '3, 5 ou 10 tours configurés dans les paramètres de l\'EventLab.',
    contreExemple: 'Une épreuve réglée sur 1 ou 2 tours seulement.',
  },
  {
    icon: '🚫',
    titre: 'Aucun adversaire',
    obligatoire: true,
    description:
      "L'épreuve doit se disputer en solo, sans IA ni autres joueurs. C'est l'équivalent du mode Rivaux de Forza, où chaque pilote roule seul contre le chronomètre. La présence d'adversaires introduit des variables incontrôlables (collisions, blocages) qui fausseraient la comparaison des temps.",
    exemple: 'Mode solo, 0 adversaire dans les paramètres de l\'épreuve.',
    contreExemple: 'Une épreuve avec des voitures IA en piste.',
  },
  {
    icon: '🔑',
    titre: 'Code EventLab valide et accessible',
    obligatoire: true,
    description:
      "L'épreuve doit être publiée et accessible via un code EventLab fonctionnel. Ce code permet à n'importe quel membre de la communauté de rejoindre la même épreuve dans les mêmes conditions exactes, garantissant que tous les temps sont comparables sur le même circuit.",
    exemple: 'Un code au format 123-456-789, actif et trouvable dans Forza.',
    contreExemple: 'Un code expiré, une épreuve non publiée ou supprimée.',
  },
];

export default function CriteresEligibiliteClient() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">

        {/* En-tête */}
        <div className="mb-10">
          <Link
            href="/epreuves-communaute"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors mb-6"
          >
            ← Retour aux épreuves communauté
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-3">
            Critères d&apos;éligibilité
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">
            Pour garantir des classements fiables et comparables, toute épreuve soumise par la communauté doit respecter ces trois critères.
          </p>
        </div>

        {/* Critères */}
        <div className="space-y-5 mb-10">
          {CRITERES.map((c) => (
            <div key={c.titre} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl mt-0.5 flex-shrink-0">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{c.titre}</h2>
                    <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-xs font-bold text-green-400">
                      Obligatoire
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                    {c.description}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-3">
                      <p className="text-xs font-bold text-green-500 mb-1">✅ Valide</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{c.exemple}</p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                      <p className="text-xs font-bold text-red-500 mb-1">❌ Non valide</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{c.contreExemple}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Note de validation */}
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-violet-500/30 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">ℹ️</span>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white mb-1">Processus de validation</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Chaque épreuve soumise est examinée par un administrateur avant d&apos;être publiée. Si ton épreuve ne respecte pas l&apos;un de ces critères, elle sera refusée. Tu pourras en soumettre une nouvelle à tout moment.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/epreuves-communaute"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            Proposer une épreuve
          </Link>
        </div>

      </div>
    </main>
  );
}
