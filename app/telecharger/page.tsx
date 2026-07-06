import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Télécharger le Relais',
  description: 'Téléchargez BetterRivals.exe, le relais UDP Windows qui capte automatiquement vos données télémétriques Forza et les envoie sur Better Rivals.',
};

export default function TelechargerPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-6 pb-24">

      {/* Hero */}
      <div className="max-w-4xl w-full text-center space-y-6 mt-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          Windows 10 / 11 — Aucune installation requise
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold">
          Le Relais{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
            UDP
          </span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          Un petit programme à lancer en arrière-plan avant de jouer. Il intercepte les données
          télémétriques de Forza et les envoie automatiquement sur Better Rivals.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <a
            href="https://github.com/RaptikFr/better-rivals-web/releases/latest/download/BetterRivals.exe"
            className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:scale-105 hover:opacity-90 transition-all shadow-lg shadow-pink-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Télécharger v3.1.0
          </a>
          <Link
            href="/inscription"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
          >
            Créer un compte
          </Link>
        </div>
      </div>

      {/* Ce que fait le Relais */}
      <div className="mt-20 max-w-5xl mx-auto w-full border-t border-neutral-200 dark:border-neutral-800 pt-16">
        <h2 className="text-3xl font-bold text-center mb-3">Comment fonctionne le Relais&nbsp;?</h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-center mb-12 max-w-2xl mx-auto">
          Forza Horizon peut émettre des données de télémétrie en temps réel. Le Relais s&apos;en charge à ta place.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl">
            <div className="text-3xl mb-4">📡</div>
            <h3 className="text-lg font-bold mb-2">Écoute la télémétrie</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Forza émet en continu des paquets UDP sur le port 5300 (127.0.0.1). Le Relais écoute ce
              flux et lit les données brutes : vitesse, position, temps au tour, etc.
            </p>
          </div>

          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl">
            <div className="text-3xl mb-4">⚙️</div>
            <h3 className="text-lg font-bold mb-2">Détecte et valide</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Il détecte automatiquement le début et la fin d&apos;un tour, filtre les
              sorties de piste et calcule le chrono final propre — sans que tu n&apos;aies rien à faire.
            </p>
          </div>

          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl">
            <div className="text-3xl mb-4">☁️</div>
            <h3 className="text-lg font-bold mb-2">Envoie sur Better Rivals</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Le chrono validé est transmis à l&apos;API Better Rivals avec les métadonnées
              (voiture, classe, transmission). Il s&apos;intègre instantanément dans les classements.
            </p>
          </div>
        </div>
      </div>

      {/* Guide d'installation */}
      <div className="mt-20 max-w-5xl mx-auto w-full border-t border-neutral-200 dark:border-neutral-800 pt-16">
        <h2 className="text-3xl font-bold text-center mb-12">Installation en 5 minutes</h2>

        <div className="space-y-4 max-w-3xl mx-auto">

          <div className="flex gap-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <div className="text-pink-500 font-black text-3xl leading-none w-10 shrink-0">01</div>
            <div>
              <p className="font-bold mb-1">Crée un compte Better Rivals</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Le Relais a besoin de tes identifiants pour enregistrer tes chronos sur ton profil.{' '}
                <Link href="/inscription" className="text-pink-500 hover:underline font-semibold">
                  Inscription gratuite →
                </Link>
              </p>
            </div>
          </div>

          <div className="flex gap-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <div className="text-violet-500 font-black text-3xl leading-none w-10 shrink-0">02</div>
            <div>
              <p className="font-bold mb-1">Télécharge et lance <code className="text-sm bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded">BetterRivals.exe</code></p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Aucune installation — un simple double-clic suffit. Windows SmartScreen peut
                afficher un avertissement la première fois ; clique sur &quot;Informations complémentaires&quot;
                puis &quot;Exécuter quand même&quot;.
              </p>
            </div>
          </div>

          <div className="flex gap-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <div className="text-pink-500 font-black text-3xl leading-none w-10 shrink-0">03</div>
            <div>
              <p className="font-bold mb-1">Connecte-toi dans le Relais</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Saisis ton email et ton mot de passe Better Rivals. Le Relais se souvient de
                ta session d&apos;une fois sur l&apos;autre.
              </p>
            </div>
          </div>

          <div className="flex gap-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <div className="text-violet-500 font-black text-3xl leading-none w-10 shrink-0">04</div>
            <div>
              <p className="font-bold mb-1">Active la Sortie de données dans Forza</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Dans Forza Horizon 6 : <strong className="text-neutral-900 dark:text-white">Options → HUD et gameplay → Sortie de données</strong>.
                Règle le type sur <em>Tableau de bord</em>, l&apos;adresse IP sur{' '}
                <code className="text-sm bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded">127.0.0.1</code> et le port sur{' '}
                <code className="text-sm bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded">5300</code>.
              </p>
            </div>
          </div>

          <div className="flex gap-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <div className="text-pink-500 font-black text-3xl leading-none w-10 shrink-0">05</div>
            <div>
              <p className="font-bold mb-1">Sélectionne un circuit et roule&nbsp;!</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Dans le Relais, choisis l&apos;épreuve que tu vas faire. Lance la course dans Forza —
                ton meilleur tour est enregistré automatiquement à la fin.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Bon à savoir — limitation télémétrie */}
      <div className="mt-20 max-w-3xl mx-auto w-full">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="text-2xl leading-none mt-0.5">⚠️</div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200">
                Épreuves à nombre de tours fixe&nbsp;: le dernier tour n&apos;est pas capté
              </h3>
              <p className="text-sm text-amber-800/90 dark:text-amber-100/80">
                Sur les épreuves à <strong>nombre de tours fixe</strong> (défis communauté notamment), Forza
                <strong> arrête d&apos;émettre sa télémétrie juste avant la ligne d&apos;arrivée du dernier tour</strong> et
                remet les temps à zéro dès la fin de la course. Le temps du tour final n&apos;est donc jamais
                transmis&nbsp;: c&apos;est une limite de Forza, pas du Relais — il est impossible de le récupérer.
              </p>
              <p className="text-sm text-amber-800/90 dark:text-amber-100/80">
                <strong>Conséquence&nbsp;:</strong> tous tes tours sont enregistrés <em>sauf</em> le dernier. Si ton
                meilleur tour risque d&apos;être le dernier, privilégie un mode où tu peux <strong>enchaîner les tours
                sans limite</strong> (contre-la-montre / rivals), ou fais un tour supplémentaire après ton tour rapide
                quand l&apos;épreuve le permet.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA bas de page */}
      <div className="mt-20 max-w-3xl mx-auto w-full text-center">
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-10 space-y-4">
          <p className="text-2xl font-extrabold">Prêt à grimper dans les classements&nbsp;?</p>
          <p className="text-neutral-500 dark:text-neutral-400">
            Télécharge le Relais, crée ton compte et bats des records dès ce soir.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <a
              href="https://github.com/RaptikFr/better-rivals-web/releases/latest/download/BetterRivals.exe"
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:scale-105 hover:opacity-90 transition-all shadow-lg shadow-pink-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Télécharger v3.1.0
            </a>
            <Link
              href="/classements"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all"
            >
              Voir les classements
            </Link>
          </div>
        </div>
      </div>

    </main>
  );
}
