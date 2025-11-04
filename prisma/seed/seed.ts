import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  const password = 'password';
  const salt = await bcrypt.genSalt();
  const hash = await bcrypt.hash(password, salt);

  // --- USERS ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@agence.ci' },
    update: {},
    create: {
      fullname: 'Admin Principal',
      email: 'admin@agence.ci',
      password: hash, // à remplacer par bcrypt plus tard
      role: 'ADMIN',
      phone: '+2250101010101',
    },
  });

  console.log({ admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
