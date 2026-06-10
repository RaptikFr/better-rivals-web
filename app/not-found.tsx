import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
          404
        </p>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
          Page introuvable
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
