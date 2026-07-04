import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('pass') !== 'arreglar-fases') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Delete existing buggy matches (Quarters, Semis, Third place, Final)
    const deleted = await db.match.deleteMany({
      where: {
        stage: {
          in: ['QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL']
        }
      }
    });

    // 2. Insert the correct matches
    const correctMatches = [
      {
        externalMatchId: "openfootball_2026_knockout_25",
        homeTeam: "W89",
        awayTeam: "W90",
        matchDate: new Date("2026-07-09T20:00:00.000Z"),
        groupName: "Fase Final",
        stage: "QUARTER",
        status: "SCHEDULED" as const
      },
      {
        externalMatchId: "openfootball_2026_knockout_26",
        homeTeam: "W93",
        awayTeam: "W94",
        matchDate: new Date("2026-07-10T19:00:00.000Z"),
        groupName: "Fase Final",
        stage: "QUARTER",
        status: "SCHEDULED" as const
      },
      {
        externalMatchId: "openfootball_2026_knockout_27",
        homeTeam: "W91",
        awayTeam: "W92",
        matchDate: new Date("2026-07-11T21:00:00.000Z"),
        groupName: "Fase Final",
        stage: "QUARTER",
        status: "SCHEDULED" as const
      },
      {
        externalMatchId: "openfootball_2026_knockout_28",
        homeTeam: "W95",
        awayTeam: "W96",
        matchDate: new Date("2026-07-12T01:00:00.000Z"),
        groupName: "Fase Final",
        stage: "QUARTER",
        status: "SCHEDULED" as const
      },
      {
        externalMatchId: "openfootball_2026_knockout_29",
        homeTeam: "W97",
        awayTeam: "W98",
        matchDate: new Date("2026-07-14T19:00:00.000Z"),
        groupName: "Fase Final",
        stage: "SEMI",
        status: "SCHEDULED" as const
      },
      {
        externalMatchId: "openfootball_2026_knockout_30",
        homeTeam: "W99",
        awayTeam: "W100",
        matchDate: new Date("2026-07-15T19:00:00.000Z"),
        groupName: "Fase Final",
        stage: "SEMI",
        status: "SCHEDULED" as const
      },
      {
        externalMatchId: "openfootball_2026_knockout_31",
        homeTeam: "L101",
        awayTeam: "L102",
        matchDate: new Date("2026-07-18T21:00:00.000Z"),
        groupName: "Fase Final",
        stage: "THIRD_PLACE",
        status: "SCHEDULED" as const
      },
      {
        externalMatchId: "openfootball_2026_knockout_32",
        homeTeam: "W101",
        awayTeam: "W102",
        matchDate: new Date("2026-07-19T19:00:00.000Z"),
        groupName: "Fase Final",
        stage: "FINAL",
        status: "SCHEDULED" as const
      }
    ];

    const inserted = await db.match.createMany({
      data: correctMatches
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: deleted.count,
      insertedCount: inserted.count
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
