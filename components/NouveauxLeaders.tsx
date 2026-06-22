"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DiscordTag } from '@/components/DiscordTag';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { usePreferences } from '@/hooks/usePreferences';
import { classementHref } from '@/lib/classementLink';
import type { LeaderFeedItem } from '@/lib/leadersFeed';
import type { Drivetrain } from '@/types/supabase';

export default function NouveauxLeaders({ items }: { items: LeaderFeedItem[] }) {
  const { formatTime, formatDate } = usePreferences();
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <div className="mt-24 max-w-5xl mx-auto w-full border-t border-neutral-200 dark:border-neutral-800 pt-16">
      <h2 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
        👑 Nouveaux leaders
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400 text-center mb-10">
        Les changements de leader les plus récents, toutes configurations confondues.
      </p>

      <div className="flex flex-col gap-3">
        {items.map(item => {
          const gap = item.oldTimeMs - item.newTimeMs;
          const href = classementHref({
            trackId:     item.track_id,
            carClass:    item.car_class,
            drivetrain:  item.drivetrain,
            car:         item.car !== '—' ? item.car : null,
            highlightId: item.lapId,
          });
          return (
            <div
              key={item.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(href)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(href);
                }
              }}
              title="Voir cette configuration dans le classement"
              className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 cursor-pointer hover:border-pink-400/60 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono font-bold text-pink-400 text-xl">
                  {formatTime(item.newTimeMs)}
                </span>
                {gap > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    title={`Ancien record : ${formatTime(item.oldTimeMs)}`}
                  >
                    👑 −{(gap / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}s
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">
                  <Link
                    href={`/joueurs/${encodeURIComponent(item.newLeader.pseudo)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-pink-400 transition-colors"
                  >
                    {item.newLeader.pseudo}
                  </Link>
                  <DiscordTag tag={item.newLeader.discord_tag} />
                  <span className="text-neutral-500 font-normal"> a détrôné </span>
                  <Link
                    href={`/joueurs/${encodeURIComponent(item.oldLeader.pseudo)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-neutral-600 dark:text-neutral-400 hover:text-pink-400 transition-colors"
                  >
                    {item.oldLeader.pseudo}
                  </Link>
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                  {item.car}{item.track ? ` · ${item.track}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded text-xs font-bold" style={CLASS_STYLES[item.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>
                  {item.car_class}
                </span>
                {item.drivetrain && (
                  <DrivetrainBadge drivetrain={item.drivetrain as Drivetrain} />
                )}
              </div>

              <span className="text-xs text-neutral-500 shrink-0">{formatDate(item.recorded_at)}</span>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/classements"
          className="inline-block px-6 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
        >
          Voir tous les classements →
        </Link>
      </div>
    </div>
  );
}
