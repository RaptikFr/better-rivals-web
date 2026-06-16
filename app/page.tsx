import Link from 'next/link';
import Image from 'next/image';
import DerniersChronos from '@/components/DerniersChronos';
import NouveauxLeaders from '@/components/NouveauxLeaders';
import { siteUrl } from '@/lib/site';
import { getDerniersChronos } from '@/lib/derniersChronos';
import { getNouveauxLeaders } from '@/lib/leadersFeed';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Better Rivals FH6',
  alternateName: ['Better Rivals', 'Better Rivals Forza Horizon 6'],
  url: siteUrl,
  description:
    "Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6. Battez-vous à armes égales.",
  inLanguage: 'fr-FR',
};

export default async function Home() {
  // Récupération serveur (cachée 60 s) : le contenu est dans le HTML initial
  // — meilleur SEO et affichage immédiat, sans waterfall côté client.
  // Un flux en échec ne doit pas casser la page d'accueil.
  const [chronos, leaders] = await Promise.all([
    getDerniersChronos().catch(() => []),
    getNouveauxLeaders().catch(() => []),
  ]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-6 pb-24">

      {/* Données structurées pour Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* --- SECTION HAUT (En-tête) --- */}
      <div className="max-w-4xl text-center space-y-8 mt-0">

        {/* Bannière */}
        <Image
          src="/og-image.jpg"
          alt="Better Rivals FH6 — classement Forza Horizon 6"
          width={1280}
          height={512}
          priority
          className="w-full rounded-2xl"
        />

        {/* Titre principal (H1) — mots-clés pour le référencement */}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Better Rivals FH6 — le classement de{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
            Forza Horizon 6
          </span>
        </h1>

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

          <Link
            href="/telecharger"
            className="px-8 py-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-bold rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
          >
            Télécharger le Relais UDP
          </Link>
        </div>
      </div>

      <NouveauxLeaders items={leaders} />

      <DerniersChronos chronos={chronos} />

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

    </main>
  );
}
