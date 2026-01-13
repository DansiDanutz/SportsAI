import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markOnboardingComplete() {
  const email = process.argv[2] || 'semebitcoin@gmail.com';

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`User with email ${email} not found!`);
      process.exit(1);
    }

    // Get current preferences
    const currentPrefs = user.preferences ? JSON.parse(user.preferences) : {};
    
    // Update preferences to mark onboarding as complete
    const updatedPrefs = {
      ...currentPrefs,
      hasCompletedOnboarding: true,
    };

    await prisma.user.update({
      where: { email },
      data: {
        preferences: JSON.stringify(updatedPrefs),
      },
    });

    console.log('✅ Onboarding marked as complete!');
    console.log(`Email: ${email}`);
    console.log(`User ID: ${user.id}`);
  } catch (error) {
    console.error('❌ Error updating onboarding status:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

markOnboardingComplete();
