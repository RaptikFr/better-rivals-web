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
              Téléchargez notre petit programme relais et lancez-le en arrière-plan. Assurez-vous d'avoir activé la "Sortie de données" dans les paramètres HUD de Forza.
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
              Dans Forza, entrez le code EventLab et lancez l'épreuve en mode <strong>Solo / Test Drive</strong>. Le jeu gère le chronomètre, notre relais s'occupe du reste.
            </p>
          </div>

          {/* Étape 4 */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl hover:border-violet-500/50 transition-colors">
            <div className="text-violet-500 font-black text-4xl mb-4">04</div>
            <h3 className="text-xl font-bold text-white mb-2">Pilotez Proprement</h3>
            <p className="text-neutral-400">
              Ici, on joue "Fair Play". Si vous utilisez la fonction <strong>Rembobiner</strong> ou si vous ratez un point de contrôle, votre tour sera invalidé par la télémétrie.
            </p>
          </div>

        </div>
      </div>
      {/* --------------------------------- */}
      
    </main>
  );
}