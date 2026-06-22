import { NextRequest, NextResponse } from 'next/server';
import { Stage, MatchStatus } from '@prisma/client';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { parseMatchDateTime } from '@/lib/sync-matches';
import { buildGroupStandings } from '@/app/api/groups/route';

// Round of 32 fixture structure from worldcup.json
// team1/team2 are placeholders like "1A", "2B", "3A/B/C/D/F"
// We resolve 1X and 2X automatically. 3X/Y/Z requires FIFA announcement.

type SlotType = '1st' | '2nd' | '3rd';

interface SlotResult {
  team: string | null; // null = "A definir"
  label: string;       // e.g. "1° Grupo A" or "Mejor 3° A/B/C"
}

function resolveSlot(
  placeholder: string,
  groupStandings: { groupName: string; teams: { team: string }[] }[]
): SlotResult {
  // Normalize group letter from "Grupo A" → "A"
  const getTeam = (pos: number, groupLetter: string) => {
    const full = `Grupo ${groupLetter}`;
    const group = groupStandings.find((g) => g.groupName === full);
    return group?.teams[pos]?.team ?? null;
  };

  // "1A" → 1st of Group A
  const simpleMatch = placeholder.match(/^([12])([A-L])$/);
  if (simpleMatch) {
    const pos = parseInt(simpleMatch[1]) - 1;
    const letter = simpleMatch[2];
    const team = getTeam(pos, letter);
    return {
      team,
      label: `${pos === 0 ? '1°' : '2°'} Grupo ${letter}`,
    };
  }

  // "3A/B/C/D/F" → best 3rd place from those groups (FIFA determines after all groups done)
  const thirdMatch = placeholder.match(/^3([A-L\/]+)$/);
  if (thirdMatch) {
    const groups = thirdMatch[1].split('/');
    return {
      team: null,
      label: `Mejor 3° ${groups.join('/')}`,
    };
  }

  // W73, W74 etc (Round of 16+) — not handled here
  return { team: null, label: placeholder };
}

export async function POST(request: NextRequest) {
  try {
    // Load fixture JSON
    const filePath = path.join(process.cwd(), 'fixture', 'worldcup.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    // Get current group standings
    const groupMatches = await db.match.findMany({
      where: { stage: Stage.GROUP },
      orderBy: { matchDate: 'asc' },
    });
    const groupStandings = buildGroupStandings(groupMatches);

    // Filter Round of 32 matches from fixture
    const r32Fixtures = (data.matches || []).filter(
      (m: any) => m.round === 'Round of 32'
    );

    const created = [];
    const skipped = [];

    for (const fixture of r32Fixtures) {
      const matchDate = parseMatchDateTime(fixture.date, fixture.time);
      const slot1 = resolveSlot(fixture.team1, groupStandings);
      const slot2 = resolveSlot(fixture.team2, groupStandings);

      const homeTeam = slot1.team ?? `[${slot1.label}]`;
      const awayTeam = slot2.team ?? `[${slot2.label}]`;
      const externalId = `r32_${fixture.num}`;

      // Skip if already exists
      const existing = await db.match.findUnique({ where: { externalMatchId: externalId } });
      if (existing) {
        skipped.push(`${homeTeam} vs ${awayTeam}`);
        continue;
      }

      const match = await db.match.create({
        data: {
          externalMatchId: externalId,
          homeTeam,
          awayTeam,
          matchDate,
          groupName: 'Round of 32',
          stage: Stage.ROUND_32,
          status: MatchStatus.SCHEDULED,
        },
      });

      created.push(`${homeTeam} vs ${awayTeam}`);
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      message: `${created.length} partidos creados, ${skipped.length} ya existían.`,
    });
  } catch (err: any) {
    console.error('Knockout generate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
