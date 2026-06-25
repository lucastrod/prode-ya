import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
config({ path: '.env' });

const USER_ID = '3267dd4b-2681-4a17-bb5f-2eb736322de8';

// From screenshot:
// - Suiza (home) vs Canadá (away)  → Dani: Suiza 3, Canadá 2 → home=3, away=2
// - Bosnia (home) vs Catar (away)  → Dani: Bosnia 2, Catar 1  → home=2, away=1
const predictions = [
  { matchId: 11, predictedHomeScore: 3, predictedAwayScore: 2 }, // Suiza 3 - Canadá 2
  { matchId: 12, predictedHomeScore: 2, predictedAwayScore: 1 }, // Bosnia 2 - Catar 1
];

const connectionString = process.env.POSTGRES_PRISMA_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('neon.tech') ? true : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const pred of predictions) {
    const match = await prisma.match.findUnique({ where: { id: pred.matchId } });
    if (!match) {
      console.error(`❌ Match ${pred.matchId} not found`);
      continue;
    }
    console.log(`\nMatch ${pred.matchId}: ${match.homeTeam} (home) vs ${match.awayTeam} (away)`);
    console.log(`  → Predicción: ${pred.predictedHomeScore}-${pred.predictedAwayScore}`);

    const result = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: USER_ID, matchId: pred.matchId } },
      update: {
        predictedHomeScore: pred.predictedHomeScore,
        predictedAwayScore: pred.predictedAwayScore,
      },
      create: {
        userId: USER_ID,
        matchId: pred.matchId,
        predictedHomeScore: pred.predictedHomeScore,
        predictedAwayScore: pred.predictedAwayScore,
      },
    });

    console.log(`  ✅ Guardado (prediction id=${result.id})`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
