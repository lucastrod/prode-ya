import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { recalculateMatchPoints } from '@/lib/points-engine';

export async function GET() {
  try {
    const match = await db.match.findFirst({
      where: { id: 106 }
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const usersToFind = ['Gonza', 'Dany', 'Pablo'];
    const users = await db.user.findMany({
      where: {
        OR: usersToFind.map(name => ({ name: { contains: name } }))
      }
    });

    const gonza = users.find(u => u.name.includes('Gonza'));
    const dany = users.find(u => u.name.includes('Dany'));
    const pablo = users.find(u => u.name.includes('Pablo'));

    if (!gonza || !dany || !pablo) {
      return NextResponse.json({ 
        error: 'Users not found', 
        found: users.map(u => u.name) 
      }, { status: 400 });
    }

    // Gonza: Canada 2 - Sudafrica 1 => home=1, away=2
    await db.prediction.upsert({
      where: { userId_matchId: { userId: gonza.id, matchId: match.id } },
      create: { userId: gonza.id, matchId: match.id, predictedHomeScore: 1, predictedAwayScore: 2 },
      update: { predictedHomeScore: 1, predictedAwayScore: 2 }
    });

    // Dany: Canada 3 - Sudafrica 1 => home=1, away=3
    await db.prediction.upsert({
      where: { userId_matchId: { userId: dany.id, matchId: match.id } },
      create: { userId: dany.id, matchId: match.id, predictedHomeScore: 1, predictedAwayScore: 3 },
      update: { predictedHomeScore: 1, predictedAwayScore: 3 }
    });

    // Pablo: Canada 2 - Sudafrica 1 => home=1, away=2
    await db.prediction.upsert({
      where: { userId_matchId: { userId: pablo.id, matchId: match.id } },
      create: { userId: pablo.id, matchId: match.id, predictedHomeScore: 1, predictedAwayScore: 2 },
      update: { predictedHomeScore: 1, predictedAwayScore: 2 }
    });

    // Recalculate match points
    await recalculateMatchPoints(match.id);

    return NextResponse.json({ success: true, message: 'Predictions injected and points recalculated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
