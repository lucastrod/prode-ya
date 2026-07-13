import { Stage, MatchStatus } from '@prisma/client';
import db from './db';

/**
 * Resolves knockout bracket placeholders (W97, W98, L101, etc.) by looking up
 * the actual winner/loser of referenced matches.
 * 
 * Called automatically when a knockout match is marked as FINISHED,
 * and also manually via POST /api/admin/knockout/resolve.
 */
export async function resolveKnockoutBrackets(): Promise<{
  resolved: string[];
  skipped: string[];
}> {
  const unresolvedMatches = await db.match.findMany({
    where: {
      stage: { not: Stage.GROUP },
      OR: [
        { homeTeam: { startsWith: 'W' } },
        { homeTeam: { startsWith: 'L' } },
        { awayTeam: { startsWith: 'W' } },
        { awayTeam: { startsWith: 'L' } },
      ],
    },
  });

  const resolved: string[] = [];
  const skipped: string[] = [];

  if (unresolvedMatches.length === 0) {
    return { resolved, skipped };
  }

  // Helper to get winner/loser team name from a placeholder like "W97" or "L101"
  const getTeamFromRef = async (ref: string): Promise<string | null> => {
    const type = ref.substring(0, 1); // 'W' or 'L'
    const matchNum = ref.substring(1);

    // Try multiple externalMatchId formats used across different import pipelines.
    // We filter out GROUP stage to avoid false positives from old fixtures with numeric IDs.
    const knockoutOffset = parseInt(matchNum) - 72;

    // Try the openfootball_2026_knockout_N format first (most reliable for this tournament)
    let referencedMatch = knockoutOffset > 0
      ? await db.match.findFirst({
          where: {
            externalMatchId: `openfootball_2026_knockout_${knockoutOffset}`,
            stage: { not: Stage.GROUP },
          },
        })
      : null;

    // Fallback to other formats if not found
    if (!referencedMatch) {
      referencedMatch = await db.match.findFirst({
        where: {
          stage: { not: Stage.GROUP },
          OR: [
            { externalMatchId: matchNum },
            { externalMatchId: `r32_${matchNum}` },
            { externalMatchId: `openfootball_2026_${matchNum}` },
          ],
        },
      });
    }

    if (!referencedMatch || referencedMatch.status !== MatchStatus.FINISHED) {
      return null;
    }

    const hs = referencedMatch.homeScore ?? 0;
    const as_ = referencedMatch.awayScore ?? 0;

    let winner: 'home' | 'away';
    if (referencedMatch.penaltyWinner) {
      winner = referencedMatch.penaltyWinner === 'home' ? 'home' : 'away';
    } else {
      winner = hs > as_ ? 'home' : 'away';
    }

    if (type === 'W') {
      return winner === 'home' ? referencedMatch.homeTeam : referencedMatch.awayTeam;
    } else {
      return winner === 'home' ? referencedMatch.awayTeam : referencedMatch.homeTeam;
    }
  };

  for (const match of unresolvedMatches) {
    let homeTeam = match.homeTeam;
    let awayTeam = match.awayTeam;
    let updated = false;

    if (homeTeam.startsWith('W') || homeTeam.startsWith('L')) {
      const resolvedHome = await getTeamFromRef(homeTeam);
      if (resolvedHome) {
        homeTeam = resolvedHome;
        updated = true;
      }
    }

    if (awayTeam.startsWith('W') || awayTeam.startsWith('L')) {
      const resolvedAway = await getTeamFromRef(awayTeam);
      if (resolvedAway) {
        awayTeam = resolvedAway;
        updated = true;
      }
    }

    if (updated) {
      await db.match.update({
        where: { id: match.id },
        data: { homeTeam, awayTeam },
      });
      resolved.push(`${match.homeTeam} vs ${match.awayTeam} → ${homeTeam} vs ${awayTeam}`);
    } else {
      skipped.push(`${match.homeTeam} vs ${match.awayTeam} (esperando partido de origen)`);
    }
  }

  return { resolved, skipped };
}
