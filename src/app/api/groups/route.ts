import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { MatchStatus, Stage } from '@prisma/client';

export interface TeamStanding {
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

export interface GroupStanding {
  groupName: string;
  teams: TeamStanding[];
}

export function buildGroupStandings(matches: any[]): GroupStanding[] {
  const groups: Record<string, Record<string, TeamStanding>> = {};

  for (const match of matches) {
    if (match.status !== MatchStatus.FINISHED || match.homeScore === null || match.awayScore === null) continue;

    const g = match.groupName;
    if (!groups[g]) groups[g] = {};

    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const hs = match.homeScore;
    const as_ = match.awayScore;

    if (!groups[g][homeTeam]) groups[g][homeTeam] = { team: homeTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };
    if (!groups[g][awayTeam]) groups[g][awayTeam] = { team: awayTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };

    const home = groups[g][homeTeam];
    const away = groups[g][awayTeam];

    home.played++; away.played++;
    home.goalsFor += hs; home.goalsAgainst += as_;
    away.goalsFor += as_; away.goalsAgainst += hs;
    home.goalDiff = home.goalsFor - home.goalsAgainst;
    away.goalDiff = away.goalsFor - away.goalsAgainst;

    if (hs > as_) {
      home.won++; home.points += 3;
      away.lost++;
    } else if (hs < as_) {
      away.won++; away.points += 3;
      home.lost++;
    } else {
      home.drawn++; home.points++;
      away.drawn++; away.points++;
    }
  }

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, teamsMap]) => ({
      groupName,
      teams: Object.values(teamsMap).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
      }),
    }));
}

export async function GET() {
  try {
    const matches = await db.match.findMany({
      where: { stage: Stage.GROUP },
      orderBy: { matchDate: 'asc' },
    });

    const standings = buildGroupStandings(matches);
    return NextResponse.json({ standings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
