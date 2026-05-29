import Link from 'next/link';
import Image from 'next/image';
import DerniersChronos from './components/DerniersChronos';
import DefiBanner from './components/DefiBanner';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-6 pb-24">

      {/* --- SECTION HAUT (En-tête) --- */}
      <div className="max-w-4xl text-center space-y-8 mt-0">

        {/* Bannière */}
        <Image
          src="/og-image.png"
          alt="Better Rivals FH6"
          width={1280}
          height={480}
          priority
          className="w-full rounded-2xl"
        />

        {/* Le sous-titre */}
        <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 font-medium max-w-2xl mx-auto">
          Battez-vous à armes égales. Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6.
        </p>

        {/* Les boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link
            href="/classements"
            className="px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-full hover:bg-neutral-700 dark:hover:bg-neutral-200 hover:scale-105 transition-all"
          >
            Voir les classements
          </Link>

          <a
            href="#telecharger"
            className="px-8 py-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
          >
            Télécharger le Relais UDP
          </a>
        </div>
      </div>

      <DerniersChronos />
      <DefiBanner />

      {/* --- SECTION MODE D'EMPLOI --- */}
      <div className="mt-24 max-w-5xl mx-auto text-left w-full border-t border-neutral-200 dark:border-neutral-800 pt-16">
        <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl hover:border-pink-500/50 transition-colors">
            <div className="text-pink-500 font-black text-4xl mb-4">01</div>
            <h3 className="text-xl font-bold mb-2">Crée ton compte</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Inscris-toi sur Better Rivals avec ton Gamertag Xbox exact. Ton compte te permet de retrouver tous tes chronos, de figurer dans les classements et de suivre ta progression.
            </p>
          </div>

          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl hover:border-violet-500/50 transition-colors">
            <div className="text-violet-500 font-black text-4xl mb-4">02</div>
            <h3 className="text-xl font-bold mb-2">Télécharge le Relais</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Lance BetterRivals.exe en arrière-plan, connecte-toi avec ton compte Better Rivals et choisis ton circuit. Le relais capte automatiquement les données télémétriques de Forza.
            </p>
          </div>

          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl hover:border-pink-500/50 transition-colors">
            <div className="text-pink-500 font-black text-4xl mb-4">03</div>
            <h3 className="text-xl font-bold mb-2">Configure Forza</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Active la &quot;Sortie de données&quot; dans les options HUD de Forza Horizon 6. Renseigne l&apos;adresse IP 127.0.0.1 et le port 5300. Lance ensuite l&apos;épreuve de ton choix en solo — circuit officiel ou épreuve EventLab de la communauté.
            </p>
          </div>

          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl hover:border-violet-500/50 transition-colors">
            <div className="text-violet-500 font-black text-4xl mb-4">04</div>
            <h3 className="text-xl font-bold mb-2">Roule et bats des records</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Fais le meilleur tour possible. Ton temps est automatiquement enregistré et comparé aux autres joueurs avec la même voiture, la même classe et la même transmission. Bats des records, grimpe dans le classement général et défie tes rivaux&nbsp;!
            </p>
          </div>

        </div>
      </div>

      {/* --- SECTION TÉLÉCHARGEMENT --- */}
      <div id="telecharger" className="mt-24 max-w-5xl mx-auto w-full border-t border-neutral-200 dark:border-neutral-800 pt-16">
        <h2 className="text-3xl font-bold text-center mb-4">Télécharger le Relais</h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-center mb-10 max-w-2xl mx-auto">
          Un programme Windows à lancer avant de jouer. Il capte les données télémétriques de Forza et les envoie sur Better Rivals automatiquement.
        </p>

        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 flex flex-col md:flex-row items-center gap-8">

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🖥️</span>
              <div>
                <p className="font-bold">BetterRivals.exe</p>
                <p className="text-sm text-neutral-500">Windows 10/11 — Aucune installation requise</p>
              </div>
            </div>
            <ol className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1 list-decimal list-inside">
              <li>Créez un compte sur Better Rivals</li>
              <li>Téléchargez et lancez <strong className="text-neutral-900 dark:text-white">BetterRivals.exe</strong></li>
              <li>Connectez-vous avec votre email et mot de passe</li>
              <li>Activez la &quot;Sortie de données&quot; dans les options HUD de Forza</li>
              <li>Sélectionnez un circuit et lancez les mesures !</li>
            </ol>
          </div>

          <a
            href="https://github.com/RaptikFr/better-rivals-web/releases/download/v1.3.1/BetterRivals.exe"
            className="flex-shrink-0 flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:scale-105 transition-all shadow-lg shadow-pink-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Télécharger v1.3.1
          </a>

        </div>
      </div>

    </main>
  );
}
