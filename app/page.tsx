import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 pb-24">
      
      {/* --- SECTION HAUT (En-tête) --- */}
      <div className="max-w-4xl text-center space-y-8 mt-12 md:mt-24">
        
        {/* Le Titre avec un effet de dégradé façon Forza */}
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 pb-4">
          Better Rivals
        </h1>
        
        {/* Le sous-titre */}
        <p className="text-xl md:text-2xl text-neutral-400 font-medium max-w-2xl mx-auto">
          Battez-vous à armes égales. Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6.
        </p>
        
        {/* Les boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link 
            href="/classements" 
            className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-neutral-200 hover:scale-105 transition-all"
          >
            Voir les classements
          </Link>
          
          <a 
            href="#telecharger" 
            className="px-8 py-4 bg-neutral-900 border border-neutral-700 text-white font-bold rounded-full hover:bg-neutral-800 transition-all"
          >
            Télécharger le Relais UDP
          </a>
        </div>
      </div>
      
      {/* --- SECTION MODE D'EMPLOI --- */}
      <div className="mt-24 max-w-5xl mx-auto text-left w-full border-t border-neutral-800 pt-16">
        <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Étape 1 */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl hover:border-pink-500/50 transition-colors">
            <div className="text-pink-500 font-black text-4xl mb-4">01</div>
            <h3 className="text-xl font-bold text-white mb-2">Le Relais Télémétrique</h3>
            <p className="text-neutral-400">
              Téléchargez notre petit programme relais et lancez-le en arrière-plan. Assurez-vous d&apos;avoir activé la &quot;Sortie de données&quot; dans les paramètres HUD de Forza.
            </p>
          </div>

          {/* Étape 2 */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl hover:border-violet-500/50 transition-colors">
            <div className="text-violet-500 font-black text-4xl mb-4">02</div>
            <h3 className="text-xl font-bold text-white mb-2">Le Code de Partage</h3>
            <p className="text-neutral-400">
              Trouvez un circuit qui vous plaît sur nos classements et notez son <strong>Code EventLab</strong>. Renseignez ce circuit dans le programme relais pour démarrer la session.
            </p>
          </div>

          {/* Étape 3 */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl hover:border-pink-500/50 transition-colors">
            <div className="text-pink-500 font-black text-4xl mb-4">03</div>
            <h3 className="text-xl font-bold text-white mb-2">Roulez en Solo</h3>
            <p className="text-neutral-400">
              Dans Forza, entrez le code EventLab et lancez l&apos;épreuve en mode <strong>Solo / Test Drive</strong>. Le jeu gère le chronomètre, notre relais s&apos;occupe du reste.
            </p>
          </div>

          {/* Étape 4 */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl hover:border-violet-500/50 transition-colors">
            <div className="text-violet-500 font-black text-4xl mb-4">04</div>
            <h3 className="text-xl font-bold text-white mb-2">Pilotez Proprement</h3>
            <p className="text-neutral-400">
              Ici, on joue &quot;Fair Play&quot;. Si vous utilisez la fonction <strong>Rembobiner</strong> ou si vous ratez un point de contrôle, votre tour sera invalidé par la télémétrie.
            </p>
          </div>

        </div>
      </div>

      {/* --- SECTION TÉLÉCHARGEMENT --- */}
      <div id="telecharger" className="mt-24 max-w-5xl mx-auto w-full border-t border-neutral-800 pt-16">
        <h2 className="text-3xl font-bold text-center mb-4">Télécharger le Relais</h2>
        <p className="text-neutral-400 text-center mb-10 max-w-2xl mx-auto">
          Un programme Windows à lancer avant de jouer. Il capte les données télémétriques de Forza et les envoie sur Better Rivals automatiquement.
        </p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 flex flex-col md:flex-row items-center gap-8">

          {/* Infos */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🖥️</span>
              <div>
                <p className="font-bold text-white">BetterRivals.exe</p>
                <p className="text-sm text-neutral-500">Windows 10/11 — Aucune installation requise</p>
              </div>
            </div>
            <ol className="text-sm text-neutral-400 space-y-1 list-decimal list-inside">
              <li>Créez un compte sur Better Rivals</li>
              <li>Téléchargez et lancez <strong className="text-white">BetterRivals.exe</strong></li>
              <li>Connectez-vous avec votre email et mot de passe</li>
              <li>Activez la &quot;Sortie de données&quot; dans les options HUD de Forza</li>
              <li>Sélectionnez un circuit et lancez les mesures !</li>
            </ol>
          </div>

          {/* Bouton de téléchargement */}
          <a
            href="https://github.com/RaptikFr/better-rivals-web/releases/download/v1.0.2/BetterRivals.exe"
            className="flex-shrink-0 flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:scale-105 transition-all shadow-lg shadow-pink-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Télécharger v1.0.2
          </a>

        </div>
      </div>
      {/* --------------------------------- */}
      
    </main>
  );
}
