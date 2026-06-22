import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { MatchStatus } from '@prisma/client';
import { TEAM_TRANSLATIONS } from '@/lib/sync-matches';
import { recalculateMatchPoints } from '@/lib/points-engine';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date();

    // 1. Get all SCHEDULED or LIVE matches whose kickoff has already passed
    const matchesToProcess = await db.match.findMany({
      where: {
        status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] },
        matchDate: { lte: now },
      },
    });

    if (matchesToProcess.length === 0) {
      return NextResponse.json({ success: true, savedMatches: [], message: 'No matches to process' });
    }

    // 2. Fetch ESPN scoreboard
    let apiData: any;
    try {
      const response = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
        { cache: 'no-store' }
      );
      apiData = await response.json();
    } catch (error: any) {
      console.error('Failed to fetch from ESPN API:', error.message);
      return NextResponse.json({ error: 'Error fetching ESPN API' }, { status: 500 });
    }

    const events = apiData.events || [];
    const savedMatches: string[] = [];

    // 3. For each match, find it in ESPN and save with FINISHED status + score
    //    (same behavior as the admin "Sincronizar Resultados" button)
    for (const match of matchesToProcess) {
      const apiMatch = events.find((e: any) => {
        if (!e.competitions?.[0]?.competitors) return false;
        const comps = e.competitions[0].competitors;
        if (comps.length < 2) return false;
        const homeTeamNode = comps.find((c: any) => c.homeAway === 'home');
        const awayTeamNode = comps.find((c: any) => c.homeAway === 'away');
        if (!homeTeamNode || !awayTeamNode) return false;

        const apiHomeEs = TEAM_TRANSLATIONS[homeTeamNode.team.displayName] || homeTeamNode.team.displayName;
        const apiAwayEs = TEAM_TRANSLATIONS[awayTeamNode.team.displayName] || awayTeamNode.team.displayName;

        return apiHomeEs === match.homeTeam && apiAwayEs === match.awayTeam;
      });

      if (!apiMatch) continue;

      const comps = apiMatch.competitions[0].competitors;
      const homeTeamNode = comps.find((c: any) => c.homeAway === 'home');
      const awayTeamNode = comps.find((c: any) => c.homeAway === 'away');

      const homeScore = parseInt(homeTeamNode.score, 10);
      const awayScore = parseInt(awayTeamNode.score, 10);

      if (isNaN(homeScore) || isNaN(awayScore)) continue;

      // Only close the match when ESPN confirms it's officially finished
      const statusShort = apiMatch.status?.type?.shortDetail ?? '';
      if (!['FT', 'AET', 'PEN'].includes(statusShort)) continue;

      // For penalty shootouts: homeScore/awayScore = score at end of AET (the draw).
      // penaltyWinner records who advanced — does NOT affect prediction scoring.
      let penaltyWinner: string | null = null;
      if (statusShort === 'PEN') {
        penaltyWinner = homeScore > awayScore ? 'home' : 'away';
      }

      // Save as FINISHED with current score — same as pressing the button
      await db.match.update({
        where: { id: match.id },
        data: {
          status: MatchStatus.FINISHED,
          homeScore,
          awayScore,
          ...(penaltyWinner ? { penaltyWinner } : {}),
        },
      });

      await recalculateMatchPoints(match.id);

      savedMatches.push(`${match.homeTeam} ${homeScore} - ${awayScore} ${match.awayTeam}`);
    }

    const message =
      savedMatches.length > 0
        ? `Se cerraron ${savedMatches.length} partido(s): ${savedMatches.join(', ')}`
        : 'No se encontraron resultados nuevos (ningún partido terminado según ESPN)';

    return NextResponse.json({ success: true, savedMatches, message });
  } catch (err: any) {
    console.error('Cron sync-results error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
