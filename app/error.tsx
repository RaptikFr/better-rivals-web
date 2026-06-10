"use client";

import { useEffect } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-5xl">⚠️</p>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
          Une erreur est survenue
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Quelque chose s&apos;est mal passé. Réessaie, et si le problème persiste,
          contacte-nous via la page Contact.
        </p>
        <button
          onClick={() => unstable_retry()}
          className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity"
        >
          Réessayer
        </button>
      </div>
    </main>
  );
}
