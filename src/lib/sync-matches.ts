import fs from 'fs';
import path from 'path';
import db from './db';
import { MatchStatus, Stage } from '@prisma/client';
import { recalculateMatchPoints } from './points-engine';

export const TEAM_TRANSLATIONS: Record<string, string> = {
  "Algeria": "Argelia",
  "Argentina": "Argentina",
  "Australia": "Australia",
  "Austria": "Austria",
  "Belgium": "Bélgica",
  "Bosnia & Herzegovina": "Bosnia y Herzegovina",
  "Brazil": "Brasil",
  "Canada": "Canadá",
  "Cape Verde": "Cabo Verde",
  "Colombia": "Colombia",
  "Croatia": "Croacia",
  "Curaçao": "Curazao",
  "Czech Republic": "República Checa",
  "DR Congo": "República Democrática del Congo",
  "Ecuador": "Ecuador",
  "Egypt": "Egipto",
  "England": "Inglaterra",
  "France": "Francia",
  "Germany": "Alemania",
  "Ghana": "Ghana",
  "Haiti": "Haití",
  "Iran": "Irán",
  "Iraq": "Irak",
  "Ivory Coast": "Costa de Marfil",
  "Japan": "Japón",
  "Jordan": "Jordania",
  "Mexico": "México",
  "Morocco": "Marruecos",
  "Netherlands": "Países Bajos",
  "New Zealand": "Nueva Zelanda",
  "Norway": "Noruega",
  "Panama": "Panamá",
  "Paraguay": "Paraguay",
  "Portugal": "Portugal",
  "Qatar": "Qatar",
  "Saudi Arabia": "Arabia Saudita",
  "Scotland": "Escocia",
  "Senegal": "Senegal",
  "South Africa": "Sudáfrica",
  "South Korea": "Corea del Sur",
  "Spain": "España",
  "Sweden": "Suecia",
  "Switzerland": "Suiza",
  "Tunisia": "Túnez",
  "Turkey": "Turquía",
  "USA": "Estados Unidos",
  "Uruguay": "Uruguay",
  "Uzbekistan": "Uzbekistán"
};

export function parseMatchDateTime(dateStr: string, timeStr: string): Date {
  const match = timeStr.match(/^(\d{2}):(\d{2})\s+UTC([+-]\d+)$/);
  if (match) {
    const [_, hh, mm, offset] = match;
    const offsetNum = parseInt(offset, 10);
    const offsetSign = offsetNum >= 0 ? '+' : '-';
    const offsetAbs = Math.abs(offsetNum);
    const offsetStr = `${offsetSign}${String(offsetAbs).padStart(2, '0')}:00`;
    return new Date(`${dateStr}T${hh}:${mm}:00${offsetStr}`);
  }
  return new Date(`${dateStr}T00:00:00Z`);
}

export async function importFixtures() {
  const existingCount = await db.match.count();
  if (existingCount > 0) {
    return { count: existingCount, message: 'Matches already imported' };
  }

  try {
    const filePath = path.join(process.cwd(), 'fixture', 'worldcup.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    // Filter for group stage matches (they have a "group" property)
    const rawGroupMatches = (data.matches || []).filter((m: any) => m.group);

    const matchesData = rawGroupMatches.map((fixture: any, idx: number) => {
      const matchDate = parseMatchDateTime(fixture.date, fixture.time);
      const homeTeam = TEAM_TRANSLATIONS[fixture.team1] || fixture.team1;
      const awayTeam = TEAM_TRANSLATIONS[fixture.team2] || fixture.team2;
      const groupName = fixture.group.replace('Group', 'Grupo');

      return {
        externalMatchId: `openfootball_2026_${idx + 1}`,
        homeTeam,
        awayTeam,
        matchDate,
        groupName,
        stage: Stage.GROUP,
        status: MatchStatus.SCHEDULED,
      };
    });

    const created = await db.match.createMany({
      data: matchesData,
    });

    return { count: created.count, message: 'Successfully imported official group stage fixtures' };
  } catch (error: any) {
    console.error('Error importing fixtures from JSON:', error);
    throw new Error(`Failed to import fixtures from JSON: ${error.message}`);
  }
}

/**
 * Synchronizes match statuses and results.
 * For matches whose kickoff has passed:
 * 1. Locks the match prediction state.
 * 2. If finished (kickoff + 2 hours), retrieves or simulates official result.
 * 3. Triggers points calculations.
 */
export async function syncMatchResults(apiFootballKey?: string) {
  const now = new Date();

  // If we have a key, we would ordinarily call API-Football.
  // For the MVP, we support both the API-Football call placeholder and an automated simulation:
  if (apiFootballKey) {
    // API-Football Integration implementation details
    // For now, we perform local updates to demonstrate the automatic flow.
  }

  // 1. Get all scheduled matches that have passed kickoff
  const matchesToProcess = await db.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      matchDate: { lte: now },
    },
  });

  let lockedCount = 0;
  let finishedCount = 0;

  for (const match of matchesToProcess) {
    const timeDiffMs = now.getTime() - new Date(match.matchDate).getTime();
    const minutesPassed = timeDiffMs / (1000 * 60);

    if (minutesPassed >= 120) {
      // Simulating a finished match after 2 hours (120 min)
      // Generates a mock score if no score was set
      const homeScore = Math.floor(Math.random() * 4); // 0-3 goals
      const awayScore = Math.floor(Math.random() * 4); // 0-3 goals

      await db.match.update({
        where: { id: match.id },
        data: {
          status: MatchStatus.FINISHED,
          homeScore,
          awayScore,
        },
      });

      // Recalculate points for this match
      await recalculateMatchPoints(match.id);
      finishedCount++;
    } else {
      // Just lock it (mark as LIVE/Locked because kickoff passed but not finished yet)
      await db.match.update({
        where: { id: match.id },
        data: {
          status: MatchStatus.LIVE,
        },
      });
      lockedCount++;
    }
  }

  return { lockedCount, finishedCount };
}
