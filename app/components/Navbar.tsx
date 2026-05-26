"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { href: '/epreuves-officielles', label: 'Épreuves officielles' },
  { href: '/epreuves-communaute',  label: 'Épreuves communauté' },
  { href: '/classements',          label: 'Classements'          },
  { href: '/#telecharger',         label: 'Télécharger'          },
  { href: '/contact',              label: 'Contact'              },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, loading, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-80 transition-opacity"
        >
          Better Rivals
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                {label}
              </Link>
            );
          })}

          {/* Zone auth */}
          {loading ? (
            <div className="w-24 h-8 bg-neutral-800 rounded-lg animate-pulse ml-2" />
          ) : user ? (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/profil"
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  pathname === '/profil'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                Mon profil
              </Link>
              <button
                onClick={handleSignOut}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/connexion"
                className="px-3 py-2 rounded-lg text-sm font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="px-3 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90 transition-opacity"
              >
                S&apos;inscrire
              </Link>
            </div>
          )}
        </nav>

      </div>
    </header>
  );
}
