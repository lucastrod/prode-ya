import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = new PrismaClient();
const matches = await db.match.findMany({
  where: {
    OR: [
      { homeTeam: { contains: 'Portugal' } },
      { awayTeam: { contains: 'Congo' } },
      { homeTeam: { contains: 'Congo' } },
    ]
  }
});
console.log(JSON.stringify(matches, null, 2));
await db.$disconnect();
