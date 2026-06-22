'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Clock, Lock, Save, CheckCircle, AlertCircle, Calendar, Edit2, TrendingUp } from 'lucide-react';

interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  groupName: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  homeScore: number | null;
  awayScore: number | null;
}

interface Prediction {
  matchId: number;
  predictedHomeScore: number | '';
  predictedAwayScore: number | '';
}

interface TeamStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface GroupStanding {
  groupName: string;
  teams: TeamStanding[];
}

const GROUPS = [
  'Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo E', 'Grupo F',
  'Grupo G', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K', 'Grupo L'
];

export default function GroupsPage() {
  const { user } = useAuth();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({});
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('Grupo A');
  const [loading, setLoading] = useState(true);
  const [saveStates, setSaveStates] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [savedMatchIds, setSavedMatchIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [matchesRes, predictionsRes, groupsRes] = await Promise.all([
          fetch('/api/matches'),
          fetch(`/api/predictions?userId=${user.id}`),
          fetch('/api/groups')
        ]);
        
        if (matchesRes.ok && predictionsRes.ok && groupsRes.ok) {
          const matchesData = await matchesRes.json();
          const predictionsData = await predictionsRes.json();
          const groupsData = await groupsRes.json();

          // Only keep GROUP stage matches
          const groupMatches = (matchesData.matches || []).filter((m: Match) => {
            return m.groupName && (m.groupName.startsWith('Grupo') || m.groupName.startsWith('Group'));
          });

          setMatches(groupMatches);
          setStandings(groupsData.standings || []);
          
          const predsMap: Record<number, Prediction> = {};
          const savedIds = new Set<number>();
          (predictionsData.predictions || []).forEach((p: any) => {
            predsMap[p.matchId] = {
              matchId: p.matchId,
              predictedHomeScore: p.predictedHomeScore,
              predictedAwayScore: p.predictedAwayScore,
            };
            savedIds.add(p.matchId);
          });
          setPredictions(predsMap);
          setSavedMatchIds(savedIds);
        }
      } catch (err) {
        console.error('Failed to load group stage data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Handle query parameters for automatic group selection and scroll
  useEffect(() => {
    if (!loading) {
      const searchParams = new URLSearchParams(window.location.search);
      const groupParam = searchParams.get('group');
      const matchParam = searchParams.get('match');
      
      let normalizedGroup = groupParam;
      if (normalizedGroup && normalizedGroup.startsWith('Group ')) {
        normalizedGroup = normalizedGroup.replace('Group', 'Grupo');
      }

      if (normalizedGroup && GROUPS.includes(normalizedGroup)) {
        setSelectedGroup(normalizedGroup);
      }
      
      if (matchParam) {
        setTimeout(() => {
          const el = document.getElementById(`match-${matchParam}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-sya-orange', 'shadow-lg', 'shadow-sya-orange/20');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-sya-orange', 'shadow-lg', 'shadow-sya-orange/20');
            }, 3000);
          }
        }, 100);
      }
    }
  }, [loading]);

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ([
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
    ].includes(e.key)) {
      return;
    }
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleScoreChange = (matchId: number, team: 'home' | 'away', val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    const scoreVal = cleanVal === '' ? '' : parseInt(cleanVal, 10);

    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId] || { matchId, predictedHomeScore: '', predictedAwayScore: '' },
        [team === 'home' ? 'predictedHomeScore' : 'predictedAwayScore']: scoreVal,
      },
    }));

    setSaveStates((prev) => ({ ...prev, [matchId]: 'idle' }));
  };

  const handleSavePrediction = async (matchId: number) => {
    if (!user) return;
    const pred = predictions[matchId] || { predictedHomeScore: 0, predictedAwayScore: 0 };

    setSaveStates((prev) => ({ ...prev, [matchId]: 'saving' }));

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          matchId,
          predictedHomeScore: pred.predictedHomeScore === '' ? 0 : Number(pred.predictedHomeScore),
          predictedAwayScore: pred.predictedAwayScore === '' ? 0 : Number(pred.predictedAwayScore),
        }),
      });

      if (res.ok) {
        setSaveStates((prev) => ({ ...prev, [matchId]: 'saved' }));
        setSavedMatchIds((prev) => {
          const next = new Set(prev);
          next.add(matchId);
          return next;
        });
        setTimeout(() => {
          setSaveStates((prev) => ({ ...prev, [matchId]: 'idle' }));
        }, 3000);
      } else {
        const data = await res.json();
        setSaveStates((prev) => ({ ...prev, [matchId]: 'error' }));
        alert(data.error || 'No se pudo guardar la predicción.');
      }
    } catch (err) {
      console.error('Error saving prediction:', err);
      setSaveStates((prev) => ({ ...prev, [matchId]: 'error' }));
    }
  };

  const formatMatchDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' hs';
  };

  // Filter matches for the selected group
  const filteredMatches = matches.filter((m) => {
    const groupNameEn = selectedGroup.replace('Grupo', 'Group');
    return m.groupName === selectedGroup || m.groupName === groupNameEn;
  });

  // Find standings for the selected group
  const groupStanding = standings.find((g) => {
    const groupNameEn = selectedGroup.replace('Grupo', 'Group');
    return g.groupName === selectedGroup || g.groupName === groupNameEn;
  });

  const getRowStyle = (idx: number, groupSize: number) => {
    if (idx < 2) return 'border-l-4 border-l-emerald-400'; 
    if (idx === 2) return 'border-l-4 border-l-amber-400'; 
    return 'border-l-4 border-l-transparent';
  };

  const getPositionBadge = (idx: number) => {
    if (idx === 0) return <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">1°</span>;
    if (idx === 1) return <span className="w-6 h-6 rounded-full bg-emerald-400/70 text-white text-[10px] font-black flex items-center justify-center">2°</span>;
    if (idx === 2) return <span className="w-6 h-6 rounded-full bg-amber-400/60 text-white text-[10px] font-black flex items-center justify-center">3°</span>;
    return <span className="w-6 h-6 rounded-full bg-gray-400/20 text-gray-400 text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>;
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-wide border-l-6 border-sya-orange pl-3">
          Fase de Grupos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Seleccioná un grupo para cargar tus predicciones y ver la tabla de posiciones en tiempo real. Los partidos se bloquean automáticamente 15 minutos antes de comenzar.
        </p>
      </div>

      {/* Horizontal Scrollable Group Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              selectedGroup === group
                ? 'bg-sya-orange text-white shadow-md'
                : 'bg-white dark:bg-[#111827] text-gray-500 hover:text-sya-orange border border-gray-200 dark:border-gray-800'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="sya-glass p-20 text-center text-gray-400 font-semibold animate-pulse">
          Cargando fixture de la Fase de Grupos...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="sya-glass p-12 text-center text-gray-400 font-semibold">
          No hay partidos importados en este grupo. Contactá al Administrador para importar el fixture.
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-extrabold font-serif tracking-wide border-l-4 border-sya-orange pl-3 mb-4">
              Partidos del {selectedGroup}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMatches.map((match) => {
                const pred = predictions[match.id] || { predictedHomeScore: 0, predictedAwayScore: 0 };
                const saveState = saveStates[match.id] || 'idle';
                const isLocked = new Date() >= new Date(new Date(match.matchDate).getTime() - 15 * 60000) || match.status !== 'SCHEDULED';
                
                return (
                  <div id={`match-${match.id}`} key={match.id} className="sya-glass p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-1000 hover:shadow-md">
                    
                    {/* Side Lock bar */}
                    {isLocked && (
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500"></div>
                    )}

                    {/* Match Header */}
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sya-orange" />
                        <span>{formatMatchDate(match.matchDate)}</span>
                      </div>
                      {isLocked ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full badge-locked text-[10px] uppercase font-bold">
                          <Lock className="w-3 h-3" />
                          Bloqueado
                        </span>
                      ) : (
                        <span className="bg-green-500/10 text-green-500 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold flex items-center gap-1">
                          Abierto
                        </span>
                      )}
                    </div>

                    {/* Main Score Prediction Layout */}
                    <div className="flex items-center justify-between gap-1.5 sm:gap-4 py-2">
                      
                      {/* Home Team */}
                      <div className="flex-1 text-right font-extrabold text-xs sm:text-sm md:text-base pr-1 truncate">
                        {match.homeTeam}
                      </div>

                      {/* Prediction Inputs */}
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          disabled={isLocked}
                          value={pred.predictedHomeScore}
                          onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                          onKeyDown={handleNumericKeyDown}
                          className={`w-11 h-11 sm:w-14 sm:h-14 text-center rounded-xl font-black text-lg sm:text-2xl focus:outline-none focus:ring-2 focus:ring-sya-orange focus:border-transparent transition-all no-spinner ${
                            isLocked
                              ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed border-none'
                              : 'bg-gray-500/5 border border-gray-200 dark:border-gray-800'
                          }`}
                        />
                        <span className="text-gray-400 font-extrabold text-[10px] sm:text-xs">vs</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          disabled={isLocked}
                          value={pred.predictedAwayScore}
                          onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                          onKeyDown={handleNumericKeyDown}
                          className={`w-11 h-11 sm:w-14 sm:h-14 text-center rounded-xl font-black text-lg sm:text-2xl focus:outline-none focus:ring-2 focus:ring-sya-orange focus:border-transparent transition-all no-spinner ${
                            isLocked
                              ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed border-none'
                              : 'bg-gray-500/5 border border-gray-200 dark:border-gray-800'
                          }`}
                        />
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 text-left font-extrabold text-xs sm:text-sm md:text-base pl-1 truncate">
                        {match.awayTeam}
                      </div>

                    </div>

                    {/* Footer details: Official Results or Save Action */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      
                      {/* Official Result Display */}
                      <div>
                        {match.status === 'FINISHED' ? (
                          <div className="text-xs">
                            <span className="text-gray-400 block font-bold">Resultado Oficial</span>
                            <span className="font-extrabold text-sya-blue text-sm">
                              {match.homeScore} - {match.awayScore}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium italic">Sin resultado aún</span>
                        )}
                      </div>

                      {/* Prediction save button */}
                      <div>
                        {!isLocked ? (
                          <button
                            onClick={() => handleSavePrediction(match.id)}
                            disabled={saveState === 'saving'}
                            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                              saveState === 'saved'
                               ? 'bg-green-500 text-white'
                                : saveState === 'error'
                                ? 'bg-red-500 text-white'
                                : savedMatchIds.has(match.id)
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : 'bg-sya-orange hover:bg-sya-orange-hover text-white'
                            }`}
                          >
                            {saveState === 'saving' ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : saveState === 'saved' ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Guardado</span>
                              </>
                            ) : saveState === 'error' ? (
                              <>
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Reintentar</span>
                              </>
                            ) : (
                              <>
                                {savedMatchIds.has(match.id) ? <Edit2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                                <span>{savedMatchIds.has(match.id) ? 'Editar' : 'Guardar'}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-bold block bg-gray-500/10 px-3 py-1.5 rounded-lg">
                            🔒 Pronóstico Cerrado
                          </span>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Standings Table of selected group */}
          {groupStanding && (
            <div className="pt-4">
              <h2 className="text-xl font-extrabold font-serif tracking-wide border-l-4 border-sya-orange pl-3 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sya-orange" />
                Tabla del {selectedGroup}
              </h2>
              <div className="sya-glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-gray-400 text-[10px] uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 bg-gray-500/5">
                        <th className="px-4 py-3 w-8">#</th>
                        <th className="px-2 py-3">Equipo</th>
                        <th className="px-2 py-3 text-center">PJ</th>
                        <th className="px-2 py-3 text-center">G</th>
                        <th className="px-2 py-3 text-center">E</th>
                        <th className="px-2 py-3 text-center">P</th>
                        <th className="px-2 py-3 text-center">GF</th>
                        <th className="px-2 py-3 text-center">GC</th>
                        <th className="px-2 py-3 text-center">DG</th>
                        <th className="px-2 py-3 text-center font-black text-sya-orange">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                      {groupStanding.teams.map((team, idx) => (
                        <tr
                          key={team.team}
                          className={`${getRowStyle(idx, groupStanding.teams.length)} transition-colors hover:bg-gray-500/5`}
                        >
                          <td className="pl-3 py-3">
                            {getPositionBadge(idx)}
                          </td>
                          <td className="px-2 py-3 font-bold text-sm max-w-[100px] truncate">{team.team}</td>
                          <td className="px-2 py-3 text-center text-gray-500">{team.played}</td>
                          <td className="px-2 py-3 text-center text-green-500 font-semibold">{team.won}</td>
                          <td className="px-2 py-3 text-center text-amber-500 font-semibold">{team.drawn}</td>
                          <td className="px-2 py-3 text-center text-red-400 font-semibold">{team.lost}</td>
                          <td className="px-2 py-3 text-center text-gray-500">{team.goalsFor}</td>
                          <td className="px-2 py-3 text-center text-gray-500">{team.goalsAgainst}</td>
                          <td className={`px-2 py-3 text-center font-bold ${team.goalDiff > 0 ? 'text-green-500' : team.goalDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                          </td>
                          <td className="px-2 py-3 text-center font-black text-base text-sya-orange">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex gap-4 text-[10px] font-bold text-gray-400 mt-3 px-1">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Clasifica directamente</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Posible mejor 3°</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
