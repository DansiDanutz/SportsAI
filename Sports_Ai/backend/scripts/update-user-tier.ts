import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const tier = process.argv[3] || 'premium';
  const role = process.argv[4] || 'user';

  if (!email) {
    console.error('Usage: npx tsx scripts/update-user-tier.ts <email> [tier] [role]');
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email },
    data: {
      subscriptionTier: tier,
      role: role
    },
  });

  console.log(`Updated user ${user.email}:`);
  console.log(`  - subscriptionTier: ${user.subscriptionTier}`);
  console.log(`  - role: ${user.role}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
