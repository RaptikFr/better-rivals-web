"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { isAdmin } from '@/lib/admins';

function dateRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return 'hier';
  return `il y a ${Math.floor(diff / 86400)} jours`;
}

const navLinks = [
  { href: '/epreuves-officielles', label: 'Épreuves officielles' },
  { href: '/epreuves-communaute',  label: 'Épreuves communauté' },
  { href: '/classements',          label: 'Classements'          },
  { href: '/stats',                label: 'Stats'                },
  { href: '/#telecharger',         label: 'Télécharger'          },
  { href: '/contact',              label: 'Contact'              },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, loading, signOut } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const { theme, setTheme } = useTheme();
  const [mounted,  setMounted]  = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
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
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                }`}
              >
                {label}
              </Link>
            );
          })}

          {/* Toggle thème */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className="ml-1 p-2 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors text-sm"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}

          {/* Cloche notifications */}
          {user && (
            <div ref={bellRef} className="relative ml-1">
              <button
                onClick={() => setBellOpen(o => !o)}
                className="relative p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-neutral-500 text-center py-8">Aucune notification.</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 ${
                            n.read ? 'bg-transparent' : 'bg-neutral-200 dark:bg-neutral-800'
                          }`}
                        >
                          <p className="text-sm text-neutral-900 dark:text-white leading-snug">{n.message}</p>
                          <p className="text-xs text-neutral-500 mt-1">{dateRelative(n.created_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Zone auth */}
          {loading ? (
            <div className="w-24 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse ml-2" />
          ) : user ? (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/profil"
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  pathname === '/profil'
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                }`}
              >
                Mon profil
              </Link>
              {isAdmin(user.email) && (
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    pathname === '/admin'
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/connexion"
                className="px-3 py-2 rounded-lg text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
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
