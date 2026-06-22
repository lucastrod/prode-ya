/**
 * Mock script: inserts a fake Round of 32 match that went to penalties
 * for local testing of penaltyWinner field and bracket UI.
 * Run: node --env-file=.env.local mock-knockout.mjs
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

try {
  // 1. Insert a mock Round of 32 match that ended in AET draw + penalties
  const penMatch = await db.match.upsert({
    where: { externalMatchId: 'mock_r32_pen_test' },
    create: {
      externalMatchId: 'mock_r32_pen_test',
      homeTeam: 'Argentina',
      awayTeam: 'Francia',
      matchDate: new Date('2026-06-28T20:00:00Z'),
      groupName: 'Round of 32',
      stage: 'ROUND_32',
      status: 'FINISHED',
      homeScore: 3,  // Score at end of AET
      awayScore: 3,
      penaltyWinner: 'home', // Argentina won on penalties
    },
    update: {
      status: 'FINISHED',
      homeScore: 3,
      awayScore: 3,
      penaltyWinner: 'home',
    },
  });
  console.log('✅ Partido con penales creado:', penMatch.id, penMatch.homeTeam, 'vs', penMatch.awayTeam);

  // 2. Insert a normal Round of 32 match (FT)
  const normalMatch = await db.match.upsert({
    where: { externalMatchId: 'mock_r32_normal_test' },
    create: {
      externalMatchId: 'mock_r32_normal_test',
      homeTeam: 'España',
      awayTeam: 'Alemania',
      matchDate: new Date('2026-06-29T16:00:00Z'),
      groupName: 'Round of 32',
      stage: 'ROUND_32',
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
      penaltyWinner: null,
    },
    update: {},
  });
  console.log('✅ Partido Round of 32 normal creado:', normalMatch.id, normalMatch.homeTeam, 'vs', normalMatch.awayTeam);

  // 3. Verify penaltyWinner is stored
  const check = await db.match.findUnique({ where: { externalMatchId: 'mock_r32_pen_test' } });
  console.log('\n🔍 Verificación penaltyWinner:', {
    id: check?.id,
    homeTeam: check?.homeTeam,
    awayTeam: check?.awayTeam,
    homeScore: check?.homeScore,
    awayScore: check?.awayScore,
    penaltyWinner: check?.penaltyWinner,
    stage: check?.stage,
    status: check?.status,
  });

} catch (err) {
  console.error('❌ Error:', err.message);
} finally {
  await db.$disconnect();
}
