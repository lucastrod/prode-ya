'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

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

export default function GroupsPage() {
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/groups')
      .then((r) => r.json())
      .then((d) => {
        setStandings(d.standings || []);
        // Expand all groups by default
        const allGroups = new Set<string>((d.standings || []).map((g: GroupStanding) => g.groupName));
        setExpandedGroups(allGroups);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const getRowStyle = (idx: number, groupSize: number) => {
    if (idx < 2) return 'border-l-4 border-l-emerald-400'; // classifies automatically
    if (idx === 2) return 'border-l-4 border-l-amber-400'; // potential best 3rd
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
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-wide border-l-6 border-sya-orange pl-3">
          Fase de Grupos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Posiciones en tiempo real de los 12 grupos del Mundial 2026. Los primeros dos de cada grupo avanzan directamente.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-semibold">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Clasifica directamente</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Posible mejor 3°</span>
      </div>

      {loading ? (
        <div className="sya-glass p-20 text-center text-gray-400 font-semibold animate-pulse">
          Cargando posiciones de grupos...
        </div>
      ) : standings.length === 0 ? (
        <div className="sya-glass p-12 text-center text-gray-400 font-semibold border-dashed border-2">
          No hay partidos finalizados todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {standings.map((group) => {
            const isExpanded = expandedGroups.has(group.groupName);
            return (
              <div key={group.groupName} className="sya-glass overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.groupName)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-gray-500/5 hover:bg-gray-500/10 transition-colors border-b border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-sya-orange flex items-center justify-center text-white">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <span className="font-extrabold text-base tracking-wide">{group.groupName}</span>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </button>

                {/* Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-gray-400 text-[10px] uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 bg-gray-500/5">
                          <th className="px-4 py-2 w-8">#</th>
                          <th className="px-2 py-2">Equipo</th>
                          <th className="px-2 py-2 text-center">PJ</th>
                          <th className="px-2 py-2 text-center">G</th>
                          <th className="px-2 py-2 text-center">E</th>
                          <th className="px-2 py-2 text-center">P</th>
                          <th className="px-2 py-2 text-center">GF</th>
                          <th className="px-2 py-2 text-center">GC</th>
                          <th className="px-2 py-2 text-center">DG</th>
                          <th className="px-2 py-2 text-center font-black text-sya-orange">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                        {group.teams.map((team, idx) => (
                          <tr
                            key={team.team}
                            className={`${getRowStyle(idx, group.teams.length)} transition-colors hover:bg-gray-500/5`}
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
