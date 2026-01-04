/**
 * 订阅到期提醒定时任务
 * 每天检查即将到期的订阅并发送通知
 */

import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { and, eq, lte, gte, sql } from 'drizzle-orm';
import { createNotification } from '../db';

/**
 * 检查并发送订阅到期提醒
 * @param daysBeforeExpiry 提前多少天提醒(默认3天)
 */
export async function checkAndSendExpiryReminders(daysBeforeExpiry: number = 3) {
  const db = await getDb();
  if (!db) {
    console.warn('[SubscriptionReminder] Database not available');
    return;
  }

  try {
    // 计算日期范围
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + daysBeforeExpiry - 1);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + daysBeforeExpiry);
    endDate.setHours(23, 59, 59, 999);

    // 查询即将到期的用户
    const expiringUsers = await db
      .select()
      .from(users)
      .where(
        and(
          // 订阅状态为active
          eq(users.subscriptionStatus, 'active'),
          // 订阅等级不是免费版
          sql`${users.subscriptionTier} != 'free'`,
          // 到期时间在指定范围内
          gte(users.subscriptionEndDate, startDate),
          lte(users.subscriptionEndDate, endDate)
        )
      );

    console.log(`[SubscriptionReminder] Found ${expiringUsers.length} users with expiring subscriptions`);

    // 为每个用户发送通知
    for (const user of expiringUsers) {
      if (!user.subscriptionEndDate) continue;

      const daysLeft = Math.ceil(
        (user.subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const tierNames: Record<string, string> = {
        basic: '基础版',
        pro: '专业版',
        free: '免费版',
      };

      const tierName = tierNames[user.subscriptionTier] || user.subscriptionTier;

      await createNotification({
        userId: user.id,
        type: 'subscription',
        title: '订阅即将到期',
        content: `您的${tierName}订阅将在${daysLeft}天后到期。请及时续费以继续享受高级功能。`,
        link: '/subscription',
      });

      console.log(`[SubscriptionReminder] Sent reminder to user ${user.id} (${user.email}), ${daysLeft} days left`);
    }

    return expiringUsers.length;
  } catch (error) {
    console.error('[SubscriptionReminder] Error checking expiry:', error);
    throw error;
  }
}

/**
 * 检查并处理已过期的订阅
 */
export async function checkAndHandleExpiredSubscriptions() {
  const db = await getDb();
  if (!db) {
    console.warn('[SubscriptionReminder] Database not available');
    return;
  }

  try {
    const now = new Date();

    // 查询已过期的订阅
    const expiredUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.subscriptionStatus, 'active'),
          sql`${users.subscriptionTier} != 'free'`,
          lte(users.subscriptionEndDate, now)
        )
      );

    console.log(`[SubscriptionReminder] Found ${expiredUsers.length} expired subscriptions`);

    // 将过期订阅降级为免费版
    for (const user of expiredUsers) {
      await db
        .update(users)
        .set({
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
        })
        .where(eq(users.id, user.id));

      // 发送通知
      await createNotification({
        userId: user.id,
        type: 'subscription',
        title: '订阅已到期',
        content: '您的订阅已到期,已自动降级为免费版。如需继续使用高级功能,请重新订阅。',
        link: '/subscription',
      });

      console.log(`[SubscriptionReminder] Downgraded user ${user.id} to free tier`);
    }

    return expiredUsers.length;
  } catch (error) {
    console.error('[SubscriptionReminder] Error handling expired subscriptions:', error);
    throw error;
  }
}

/**
 * 启动定时任务
 * 每天凌晨1点执行
 */
export function startSubscriptionReminderJob() {
  // 每天凌晨1点执行
  const runDailyCheck = () => {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(1, 0, 0, 0);
    
    // 如果今天的1点已过,设置为明天1点
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();

    setTimeout(async () => {
      console.log('[SubscriptionReminder] Running daily check...');
      
      try {
        // 发送到期提醒(提前3天)
        const remindersCount = await checkAndSendExpiryReminders(3);
        console.log(`[SubscriptionReminder] Sent ${remindersCount} expiry reminders`);

        // 处理已过期的订阅
        const expiredCount = await checkAndHandleExpiredSubscriptions();
        console.log(`[SubscriptionReminder] Handled ${expiredCount} expired subscriptions`);
      } catch (error) {
        console.error('[SubscriptionReminder] Error in daily check:', error);
      }

      // 递归调用,安排下一次执行
      runDailyCheck();
    }, delay);

    console.log(`[SubscriptionReminder] Next check scheduled at ${nextRun.toLocaleString('zh-CN')}`);
  };

  runDailyCheck();
}
