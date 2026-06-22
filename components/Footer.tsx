import Link from 'next/link';

const SECTIONS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Classements',
    links: [
      { href: '/classements',            label: 'Classements officiels' },
      { href: '/classements-communaute', label: 'Classements communauté' },
      { href: '/circuits',               label: 'Circuits' },
      { href: '/voitures',               label: 'Voitures' },
    ],
  },
  {
    title: 'Épreuves & outils',
    links: [
      { href: '/epreuves-officielles', label: 'Épreuves officielles' },
      { href: '/epreuves-communaute',  label: 'Épreuves communauté' },
      { href: '/comparaison',          label: 'Comparaison' },
      { href: '/reglages',             label: 'Réglages' },
      { href: '/stats',                label: 'Statistiques' },
    ],
  },
  {
    title: 'Le projet',
    links: [
      { href: '/telecharger',         label: 'Télécharger le relais' },
      { href: '/criteres-eligibilite', label: "Critères d'éligibilité" },
      { href: '/contact',             label: 'Contact' },
    ],
  },
];

const DISCORD_URL = 'https://discord.gg/d75NxScNCa';

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 mt-16">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Marque + Discord */}
          <div className="space-y-4">
            <Link
              href="/"
              className="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600"
            >
              Better Rivals
            </Link>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
              Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6.
            </p>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm font-semibold hover:bg-indigo-500/20 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Rejoindre le Discord
            </a>
          </div>

          {/* Colonnes de liens */}
          {SECTIONS.map(section => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-pink-400 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Non-affiliation */}
        <div className="mt-10 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed">
            Better Rivals est un projet indépendant. Ce site n&apos;est pas affilié à Microsoft, Xbox,
            Xbox Game Studios, Playground Games, Turn 10 ou Forza. Forza Horizon est une marque
            déposée de Microsoft.
          </p>
        </div>
      </div>
    </footer>
  );
}
