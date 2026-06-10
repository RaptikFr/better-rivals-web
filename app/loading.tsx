export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-neutral-200 dark:border-neutral-800 border-t-pink-500 animate-spin" />
        <p className="text-neutral-500 text-sm font-medium">Chargement…</p>
      </div>
    </main>
  );
}
