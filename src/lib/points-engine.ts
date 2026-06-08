import db from './db';

/**
 * Calculates the points for a prediction based on the official score.
 * Rules:
 * - Exact Score = 3 points
 * - Correct winner/draw (Outcome) = 1 point
 * - Incorrect = 0 points
 */
export function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): number {
  if (predHome === actualHome && predAway === actualAway) {
    return 3;
  }

  // Home win
  if (actualHome > actualAway && predHome > predAway) {
    return 1;
  }

  // Away win
  if (actualHome < actualAway && predHome < predAway) {
    return 1;
  }

  // Draw
  if (actualHome === actualAway && predHome === predAway) {
    return 1;
  }

  return 0;
}

/**
 * Recalculates points for all predictions of a specific match.
 */
export async function recalculateMatchPoints(matchId: number) {
  const match = await db.match.findUnique({
    where: { id: matchId },
  });

  if (!match || match.status !== 'FINISHED' || match.homeScore === null || match.awayScore === null) {
    return;
  }

  const predictions = await db.prediction.findMany({
    where: { matchId },
  });

  for (const pred of predictions) {
    const points = calculatePoints(
      pred.predictedHomeScore,
      pred.predictedAwayScore,
      match.homeScore,
      match.awayScore
    );

    await db.prediction.update({
      where: { id: pred.id },
      data: { points },
    });
  }

  // Update standings for all users after match results are calculated
  await recalculateStandings();
}

/**
 * Recalculates total points, exact scores count, and correct outcomes count for all users.
 */
export async function recalculateStandings() {
  const users = await db.user.findMany({
    select: { id: true },
  });

  for (const user of users) {
    const predictions = await db.prediction.findMany({
      where: { userId: user.id },
    });

    let totalPoints = 0;
    let exactScores = 0;
    let correctOutcomes = 0;

    for (const pred of predictions) {
      if (pred.points === 3) {
        exactScores++;
        totalPoints += 3;
      } else if (pred.points === 1) {
        correctOutcomes++;
        totalPoints += 1;
      }
    }

    await db.standing.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        totalPoints,
        exactScores,
        correctOutcomes,
      },
      update: {
        totalPoints,
        exactScores,
        correctOutcomes,
        updatedAt: new Date(),
      },
    });
  }
}
