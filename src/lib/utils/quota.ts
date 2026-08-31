import { prisma } from "@/lib/db";

/**
 * Get or create today's quota record for a student.
 */
export async function getOrCreateDailyQuota(eleveId: string): Promise<{
  chatsUsed: number;
  chatsMax: number;
  bonusChats: number;
  remaining: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get the student's default quota
  const student = await prisma.user.findUnique({
    where: { id: eleveId },
    select: { defaultQuota: true },
  });

  const defaultMax = student?.defaultQuota ?? parseInt(process.env.DEFAULT_DAILY_CHAT_QUOTA || "10");

  let quota = await prisma.quotaChat.findUnique({
    where: {
      eleveId_date: {
        eleveId,
        date: today,
      },
    },
  });

  if (!quota) {
    quota = await prisma.quotaChat.create({
      data: {
        eleveId,
        date: today,
        chatsUsed: 0,
        chatsMax: defaultMax,
        bonusChats: 0,
      },
    });
  }

  return {
    chatsUsed: quota.chatsUsed,
    chatsMax: quota.chatsMax,
    bonusChats: quota.bonusChats,
    remaining: quota.chatsMax + quota.bonusChats - quota.chatsUsed,
  };
}

/**
 * Increment the chat usage count for today.
 * Returns false if the quota is exceeded.
 */
export async function incrementChatUsage(eleveId: string): Promise<boolean> {
  const quota = await getOrCreateDailyQuota(eleveId);

  if (quota.remaining <= 0) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.quotaChat.update({
    where: {
      eleveId_date: {
        eleveId,
        date: today,
      },
    },
    data: {
      chatsUsed: { increment: 1 },
    },
  });

  return true;
}

/**
 * Add bonus chats for a student on a specific date (or today).
 */
export async function addBonusChats(
  eleveId: string,
  bonus: number,
  date?: Date
): Promise<void> {
  const targetDate = date || new Date();
  targetDate.setHours(0, 0, 0, 0);

  const student = await prisma.user.findUnique({
    where: { id: eleveId },
    select: { defaultQuota: true },
  });
  const defaultMax = student?.defaultQuota ?? parseInt(process.env.DEFAULT_DAILY_CHAT_QUOTA || "10");

  await prisma.quotaChat.upsert({
    where: {
      eleveId_date: {
        eleveId,
        date: targetDate,
      },
    },
    create: {
      eleveId,
      date: targetDate,
      chatsUsed: 0,
      chatsMax: defaultMax,
      bonusChats: bonus,
    },
    update: {
      bonusChats: { increment: bonus },
    },
  });
}

/**
 * Update the default daily quota for a student.
 */
export async function updateDefaultQuota(eleveId: string, newMax: number): Promise<void> {
  await prisma.user.update({
    where: { id: eleveId },
    data: { defaultQuota: newMax },
  });
}
