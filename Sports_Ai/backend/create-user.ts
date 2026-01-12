import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUser() {
  const args = process.argv.slice(2);
  const email = args[0] || 'admin@sportsai.com';
  const password = args[1] || 'Admin123!@#';
  const requestedRole = args[2]; // optional: user|admin
  const requestedTier = args[3]; // optional: free|premium
  const upgradeExisting = args.includes('--upgrade') || email === 'admin@sportsai.com';

  const defaultRole = email === 'admin@sportsai.com' ? 'admin' : 'user';
  const defaultTier = email === 'admin@sportsai.com' ? 'premium' : 'free';
  const role = (requestedRole || defaultRole) as any;
  const subscriptionTier = (requestedTier || defaultTier) as any;
  const creditBalance = email === 'admin@sportsai.com' ? 100000 : 0;

  try {
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      if (!upgradeExisting) {
        console.log(`User with email ${email} already exists!`);
        console.log('Tip: re-run with --upgrade to update role/tier/password for this user.');
        process.exit(1);
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const updated = await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role,
          subscriptionTier,
          creditBalance,
        },
      });

      console.log('✅ User upgraded/updated successfully!');
      console.log(`Email: ${updated.email}`);
      console.log(`ID: ${updated.id}`);
      console.log(`Role: ${updated.role}`);
      console.log(`Tier: ${updated.subscriptionTier}`);
      console.log(`Password: ${password}`);
      console.log('\nYou can now login with these credentials.');
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        subscriptionTier,
        creditBalance,
        role,
      },
    });

    console.log('✅ User created successfully!');
    console.log(`Email: ${user.email}`);
    console.log(`ID: ${user.id}`);
    console.log(`Role: ${user.role}`);
    console.log(`Tier: ${user.subscriptionTier}`);
    console.log(`Password: ${password}`);
    console.log('\nYou can now login with these credentials.');
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
