"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatTime } from '@/components/formatTime';

interface Report {
  id: string;
  raison: string;
  details: string | null;
  status: string | null;
  created_at: string | null;
  reporter: { pseudo: string } | null;
  lap_time: {
    id: string;
    time_ms: number;
    players: { pseudo: string } | null;
    cars: { manufacturer: string | null; name: string; year: number | null } | null;
    tracks: { name: string } | null;
  } | null;
}

export default function Signalements() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchReports() {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id, raison, details, status, created_at,
        reporter:reporter_id ( pseudo ),
        lap_time:lap_time_id (
          id, time_ms,
          players ( pseudo ),
          cars ( manufacturer, name, year ),
          tracks ( name )
        )
      `)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement signalements:', error.message);
    } else if (data) {
      setReports(data as Report[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchReports();
  }, []);

  async function marquerCommeLu(id: string) {
    await supabase.from('reports').update({ status: 'lu' }).eq('id', id);
    fetchReports();
  }

  async function supprimerTemps(lapTimeId: string) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce temps ? Cela effacera aussi le signalement.")) return;
    
    await supabase.from('lap_times').delete().eq('id', lapTimeId);
    // Suppression en cascade côté BDD : les reports liés à ce temps s'effaceront automatiquement
    fetchReports();
  }

  const nonLusCount = reports.filter(r => r.status === 'non_lu').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          🚩 Signalements
          {nonLusCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-lg shadow-red-500/20">
              {nonLusCount} non lu{nonLusCount > 1 ? 's' : ''}
            </span>
          )}
        </h2>
        <button onClick={fetchReports} className="text-sm px-4 py-2 border border-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors">
          🔄 Rafraîchir
        </button>
      </div>

      {loading ? (
        <p className="text-neutral-500 animate-pulse">Chargement des signalements...</p>
      ) : reports.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-xl text-center text-neutral-500">
          Aucun signalement pour le moment. Tout est clean !
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <div key={report.id} className={`p-5 rounded-xl border transition-colors flex flex-col lg:flex-row gap-6 justify-between ${
              report.status === 'non_lu' ? 'bg-red-500/5 border-red-500/30' : 'bg-neutral-900 border-neutral-800 opacity-60 hover:opacity-100'
            }`}>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black px-2 py-1 rounded tracking-wider ${report.status === 'non_lu' ? 'bg-red-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                    {report.status === 'non_lu' ? 'NOUVEAU' : 'TRAITÉ'}
                  </span>
                  <span className="text-sm text-neutral-400">Signalé par <strong className="text-white">{report.reporter?.pseudo}</strong> le {new Date(report.created_at).toLocaleDateString()}</span>
                </div>

                <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                  {report.lap_time ? (
                    <>
                      <p className="font-bold text-white text-lg flex items-center gap-3">{report.lap_time.players?.pseudo} <span className="text-pink-400 font-mono bg-pink-500/10 px-2 py-0.5 rounded">{formatTime(report.lap_time.time_ms)}</span></p>
                      <div className="text-sm text-neutral-400 mt-2 space-y-1">
                        <p>🏎️ {report.lap_time.cars?.year} {report.lap_time.cars?.manufacturer} {report.lap_time.cars?.name}</p>
                        <p>🏁 {report.lap_time.tracks?.name}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-neutral-500 italic">Ce temps a déjà été supprimé de la base de données.</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold text-red-400">Raison : {report.raison}</p>
                  {report.details && <p className="text-sm text-neutral-300 mt-2 p-3 bg-neutral-950/50 rounded-lg italic border-l-2 border-red-500/50">"{report.details}"</p>}
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px] justify-center border-t lg:border-t-0 lg:border-l border-neutral-800 pt-4 lg:pt-0 lg:pl-6">
                {report.status === 'non_lu' && <button onClick={() => marquerCommeLu(report.id)} className="px-4 py-2 bg-neutral-800 text-white font-bold rounded-lg hover:bg-neutral-700 transition-colors w-full">Marquer comme lu</button>}
                {report.lap_time && <button onClick={() => supprimerTemps(report.lap_time.id)} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 font-bold rounded-lg hover:bg-red-500/30 transition-colors w-full">Supprimer le temps</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}