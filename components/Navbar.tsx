"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { isAdmin } from '@/lib/admins';
import { dateRelative } from '@/lib/dateRelative';
import GlobalSearch from '@/components/GlobalSearch';

const navLinks = [
  { href: '/comparaison',        label: 'Comparer'           },
  { href: '/classement-general', label: 'Classement général' },
  { href: '/stats',              label: 'Stats'              },
  { href: '/voitures',           label: 'Voitures'           },
  { href: '/circuits',           label: 'Circuits'           },
  { href: '/reglages',           label: 'Réglages'           },
  { href: '/telecharger',         label: 'Télécharger'        },
  { href: '/contact',            label: 'Contact'            },
];

const EPREUVES_LINKS = [
  { href: '/epreuves-officielles', label: 'Épreuves officielles' },
  { href: '/epreuves-communaute',  label: 'Épreuves communauté'  },
];

const CLASSEMENTS_LINKS = [
  { href: '/classements',            label: 'Épreuves officielles' },
  { href: '/classements-communaute', label: 'Épreuves communauté'  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, loading, signOut } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markOneAsRead, deleteAllRead } = useNotifications();
  const [bellOpen,        setBellOpen]        = useState(false);
  const [epreuvesOpen,    setEpreuvesOpen]    = useState(false);
  const [classementsOpen, setClassementsOpen] = useState(false);
  const [mobileOpen,      setMobileOpen]      = useState(false);
  const bellRef        = useRef<HTMLDivElement>(null);
  const epreuvesRef    = useRef<HTMLDivElement>(null);
  const classementsRef = useRef<HTMLDivElement>(null);

  // Marque toutes les notifications comme lues à l'ouverture du dropdown
  // (volontairement déclenché sur bellOpen seul : réagir à unreadCount
  // marquerait comme lues des notifications arrivées dropdown ouvert)
  useEffect(() => {
    if (bellOpen && unreadCount > 0) markAllAsRead();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bellOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current        && !bellRef.current.contains(e.target as Node))        setBellOpen(false);
      if (epreuvesRef.current    && !epreuvesRef.current.contains(e.target as Node))    setEpreuvesOpen(false);
      if (classementsRef.current && !classementsRef.current.contains(e.target as Node)) setClassementsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Ferme le menu mobile à chaque navigation
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset volontaire du menu au changement de route
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const mobileLinkClass = (href: string) =>
    `block px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
      pathname === href
        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-80 transition-opacity"
        >
          Better Rivals
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-1 lg:gap-2 xl:gap-3 2xl:gap-5">

          {/* Liens desktop (cachés sur mobile, repris dans le menu burger) */}
          <nav className="hidden lg:flex items-center gap-1 lg:gap-2 xl:gap-3 2xl:gap-5">

          {/* Dropdown Épreuves */}
          <div ref={epreuvesRef} className="relative">
            <button
              onClick={() => setEpreuvesOpen(o => !o)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                ['/epreuves-officielles', '/epreuves-communaute'].includes(pathname)
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
              }`}
            >
              Épreuves
              <svg className={`w-3 h-3 transition-transform ${epreuvesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {epreuvesOpen && (
              <div className="absolute left-0 top-full mt-1 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                {EPREUVES_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setEpreuvesOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                      pathname === href
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown Classements */}
          <div
            ref={classementsRef}
            className="relative"
          >
            <button
              onClick={() => setClassementsOpen(o => !o)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                ['/classements', '/classements-communaute'].includes(pathname)
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
              }`}
            >
              Classements
              <svg className={`w-3 h-3 transition-transform ${classementsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {classementsOpen && (
              <div className="absolute left-0 top-full mt-1 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                {CLASSEMENTS_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setClassementsOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                      pathname === href
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

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
          </nav>

          {/* Recherche globale */}
          <GlobalSearch />

          {/* Paramètres */}
          <Link
            href="/parametres"
            title="Paramètres"
            aria-label="Paramètres"
            className={`ml-1 p-2 rounded-full transition-colors text-sm ${
              pathname === '/parametres'
                ? 'bg-neutral-300 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            ⚙️
          </Link>

          {/* Cloche notifications */}
          {user && (
            <div ref={bellRef} className="relative ml-1">
              {(() => {
                const latestUnread = notifications.find(n => !n.read);
                const bellColor = !latestUnread
                  ? 'text-neutral-600 dark:text-neutral-400'
                  : latestUnread.type === 'exact'      ? 'text-red-500'
                  : latestUnread.type === 'drivetrain'  ? 'text-orange-400'
                  : latestUnread.type === 'rival'       ? 'text-emerald-400'
                  : 'text-blue-400';
                const badgeBg = !latestUnread
                  ? 'bg-neutral-400'
                  : latestUnread.type === 'exact'      ? 'bg-red-500'
                  : latestUnread.type === 'drivetrain'  ? 'bg-orange-400'
                  : latestUnread.type === 'rival'       ? 'bg-emerald-400'
                  : 'bg-blue-400';
                const typeBorder: Record<string, string> = {
                  exact:      'border-l-2 border-l-red-500',
                  drivetrain: 'border-l-2 border-l-orange-400',
                  class:      'border-l-2 border-l-blue-400',
                  rival:      'border-l-2 border-l-emerald-400',
                };
                return (
                  <>
                    <button
                      onClick={() => setBellOpen(o => !o)}
                      aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lue${unreadCount > 1 ? 's' : ''})` : 'Notifications'}
                      className={`relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors ${bellColor}`}
                    >
                      🔔
                      {unreadCount > 0 && (
                        <span className={`absolute -bottom-0.5 -right-0.5 ${badgeBg} text-white text-xs font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1`}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {bellOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 max-lg:fixed max-lg:left-4 max-lg:right-4 max-lg:top-16 max-lg:w-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">Notifications</p>
                          {notifications.length > 0 && (
                            <button
                              onClick={async () => { await deleteAllRead(); setBellOpen(false); }}
                              className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                            >
                              🗑️ Effacer tout
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
                                onClick={async () => {
                                  if (!n.read) await markOneAsRead(n.id);
                                  if (n.link) { setBellOpen(false); router.push(n.link); }
                                }}
                                className={`px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 ${
                                  n.read ? 'bg-transparent' : 'bg-neutral-200 dark:bg-neutral-800'
                                } ${!n.read ? (typeBorder[n.type] ?? '') : ''} ${
                                  n.link ? 'cursor-pointer hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors' : ''
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
                  </>
                );
              })()}
            </div>
          )}

          {/* Zone auth (desktop) */}
          <div className="hidden lg:flex items-center">
          {loading ? (
            <div className="w-24 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse ml-2" />
          ) : user ? (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/objectifs"
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  pathname === '/objectifs'
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
                }`}
              >
                🎯 Objectifs
              </Link>
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
          </div>

          {/* Bouton burger (mobile) */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="lg:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-4 space-y-4">

            <div>
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Épreuves</p>
              {EPREUVES_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={mobileLinkClass(href)}>
                  {label}
                </Link>
              ))}
            </div>

            <div>
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Classements</p>
              {CLASSEMENTS_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={mobileLinkClass(href)}>
                  {label}
                </Link>
              ))}
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3">
              {navLinks.map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={mobileLinkClass(href)}>
                  {label}
                </Link>
              ))}
              <Link href="/parametres" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/parametres')}>
                ⚙️ Paramètres
              </Link>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3">
              {!loading && (user ? (
                <>
                  <Link href="/objectifs" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/objectifs')}>
                    🎯 Mes objectifs
                  </Link>
                  <Link href="/profil" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/profil')}>
                    Mon profil
                  </Link>
                  {isAdmin(user.email) && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/admin')}>
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => { setMobileOpen(false); handleSignOut(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link href="/connexion" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/connexion')}>
                    Connexion
                  </Link>
                  <Link
                    href="/inscription"
                    onClick={() => setMobileOpen(false)}
                    className="block mt-1 px-3 py-2.5 rounded-lg text-sm font-bold text-center text-white bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90 transition-opacity"
                  >
                    S&apos;inscrire
                  </Link>
                </>
              ))}
            </div>

          </div>
        </nav>
      )}
    </header>
  );
}
