import { PrismaClient, Role, Stage, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PRIZES = [
  { position: 1, title: '🥇 Primer Puesto', description: 'Cena para dos personas en restaurant premium.' },
  { position: 2, title: '🥈 Segundo Puesto', description: 'Gift Card Soluciones YA de $50,000.' },
  { position: 3, title: '🥉 Tercer Puesto', description: 'Kit Mundialista Soluciones YA (Remera, Gorra, Termo).' },
];

const DEFAULT_USERS = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Lucas Admin',
    email: 'lucas.admin@solucionesya.com.ar',
    role: Role.ADMIN,
    active: true,
  },
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    name: 'Lucas Empleado',
    email: 'lucas.empleado@solucionesya.com.ar',
    role: Role.USER,
    active: true,
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Default Users
  console.log('Creating default users...');
  for (const userData of DEFAULT_USERS) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
  }

  // 2. Create Standings for Default Users
  console.log('Creating standings...');
  for (const userData of DEFAULT_USERS) {
    await prisma.standing.upsert({
      where: { userId: userData.id },
      update: {},
      create: {
        userId: userData.id,
        totalPoints: userData.role === Role.ADMIN ? 0 : 27, // Lucas has 27 points in the mockup
        exactScores: userData.role === Role.ADMIN ? 0 : 5,  // Lucas has 5 exact hits
        correctOutcomes: userData.role === Role.ADMIN ? 0 : 12, // (5*3 + 12*1 = 27 points)
      },
    });
  }

  // 3. Create Default Prizes
  console.log('Creating prizes...');
  for (const prizeData of DEFAULT_PRIZES) {
    await prisma.prize.upsert({
      where: { position: prizeData.position },
      update: {
        title: prizeData.title,
        description: prizeData.description,
      },
      create: prizeData,
    });
  }

  // 4. Create HealthCheck Row
  console.log('Creating health check entry...');
  await prisma.healthCheck.upsert({
    where: { id: 1 },
    update: { lastPing: new Date() },
    create: { id: 1, lastPing: new Date() },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
