import { NextResponse } from 'next/server';
import { Stage, MatchStatus } from '@prisma/client';
import db from '@/lib/db';

/**
 * POST /api/admin/knockout/resolve
 *
 * Scans all non-GROUP matches that still have placeholder team names
 * (e.g. "W89", "L101") and resolves them against finished matches.
 *
 * "W{num}"  → winner of the match whose externalMatchId = num (or r32_{num})
 * "L{num}"  → loser  of the match whose externalMatchId = num (or r32_{num})
 *
 * Safe to call multiple times — only updates placeholders where the
 * referenced match is already FINISHED.
 */

const PLACEHOLDER_RE = /^\[?([WL])(\d+)\]?$/;

async function resolveTeam(
  placeholder: string,
  finishedByNum: Map<string, { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; penaltyWinner: string | null }>
): Promise<string | null> {
  const match = placeholder.match(PLACEHOLDER_RE);
  if (!match) return null;

  const [, type, num] = match;
  const finished = finishedByNum.get(num);
  if (!finished) return null;

  const { homeTeam, awayTeam, homeScore, awayScore, penaltyWinner } = finished;

  let homeWins: boolean;
  if (penaltyWinner) {
    homeWins = penaltyWinner === 'home';
  } else {
    homeWins = homeScore > awayScore;
  }

  if (type === 'W') return homeWins ? homeTeam : awayTeam;
  if (type === 'L') return homeWins ? awayTeam : homeTeam; // loser for 3rd place
  return null;
}

export async function POST() {
  try {
    // 1. Fetch all FINISHED knockout matches
    const finishedMatches = await db.match.findMany({
      where: {
        status: MatchStatus.FINISHED,
        stage: { not: Stage.GROUP },
        homeScore: { not: null },
        awayScore: { not: null },
      },
    });

    // Also include FINISHED Group-stage matches that are actually R32
    // (in case they were seeded with wrong stage) — handled by externalMatchId
    const allFinished = await db.match.findMany({
      where: {
        status: MatchStatus.FINISHED,
        homeScore: { not: null },
        awayScore: { not: null },
        externalMatchId: { not: null },
      },
    });

    // Build a map: matchNum → match data
    const finishedByNum = new Map<string, {
      homeTeam: string; awayTeam: string;
      homeScore: number; awayScore: number;
      penaltyWinner: string | null;
    }>();

    for (const m of allFinished) {
      if (!m.externalMatchId || m.homeScore === null || m.awayScore === null) continue;
      // externalMatchId can be "73" or "r32_73" → extract the numeric part
      const numMatch = m.externalMatchId.match(/(\d+)$/);
      if (numMatch) {
        finishedByNum.set(numMatch[1], {
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          penaltyWinner: m.penaltyWinner,
        });
      }
    }

    // 2. Find all non-GROUP matches with placeholder names
    const allKnockout = await db.match.findMany({
      where: { stage: { not: Stage.GROUP } },
    });

    const updated: string[] = [];
    const skipped: string[] = [];

    for (const km of allKnockout) {
      const newHome = PLACEHOLDER_RE.test(km.homeTeam)
        ? await resolveTeam(km.homeTeam, finishedByNum)
        : null;
      const newAway = PLACEHOLDER_RE.test(km.awayTeam)
        ? await resolveTeam(km.awayTeam, finishedByNum)
        : null;

      if (!newHome && !newAway) {
        // Nothing to resolve for this match
        continue;
      }

      if ((PLACEHOLDER_RE.test(km.homeTeam) && !newHome) ||
          (PLACEHOLDER_RE.test(km.awayTeam) && !newAway)) {
        // Referenced match not finished yet
        skipped.push(`${km.homeTeam} vs ${km.awayTeam} (partido referenciado aún no terminó)`);
        continue;
      }

      await db.match.update({
        where: { id: km.id },
        data: {
          ...(newHome ? { homeTeam: newHome } : {}),
          ...(newAway ? { awayTeam: newAway } : {}),
        },
      });

      const resolvedHome = newHome ?? km.homeTeam;
      const resolvedAway = newAway ?? km.awayTeam;
      updated.push(`${resolvedHome} vs ${resolvedAway}`);
    }

    return NextResponse.json({
      success: true,
      resolved: updated,
      skipped,
      message: `${updated.length} cruce(s) resuelto(s), ${skipped.length} pendiente(s).`,
    });
  } catch (err: any) {
    console.error('Knockout resolve error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
