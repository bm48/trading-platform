import { storage } from "./storage";

export interface SubscriptionStatus {
  canCreateCases: boolean;
  planType: string;
  status: string;
  message?: string;
  strategyPacksRemaining?: number;
}

export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const user = await storage.getUser(userId);
  
  if (!user) {
    return {
      canCreateCases: false,
      planType: "none",
      status: "no_user",
      message: "User not found"
    };
  }

  // Check monthly subscription first
  if (user.planType === "monthly_subscription" && user.subscriptionStatus === "active") {
    // Check if subscription is still valid
    if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date()) {
      return {
        canCreateCases: true,
        planType: "monthly_subscription",
        status: "active",
        message: "Active monthly subscription - unlimited cases"
      };
    }
  }

  // Check strategy pack credits
  if (user.planType === "strategy_pack" && (user.strategyPacksRemaining || 0) > 0) {
    return {
      canCreateCases: true,
      planType: "strategy_pack",
      status: "active",
      message: `${user.strategyPacksRemaining} strategy pack${user.strategyPacksRemaining === 1 ? '' : 's'} remaining`,
      strategyPacksRemaining: user.strategyPacksRemaining
    };
  }

  // No active subscription or credits
  return {
    canCreateCases: false,
    planType: user.planType || "none",
    status: user.subscriptionStatus || "none",
    message: "No active subscription or strategy packs available"
  };
}

export async function consumeStrategyPack(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  
  if (!user || !user.strategyPacksRemaining || user.strategyPacksRemaining <= 0) {
    return false;
  }

  await storage.updateUserSubscription(userId, {
    strategyPacksRemaining: user.strategyPacksRemaining - 1
  });

  return true;
}

export async function grantStrategyPack(userId: string, count: number = 1): Promise<void> {
  const user = await storage.getUser(userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  const currentPacks = user.strategyPacksRemaining || 0;
  
  await storage.updateUserSubscription(userId, {
    planType: "strategy_pack",
    strategyPacksRemaining: currentPacks + count
  });
}

export async function activateMonthlySubscription(userId: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await storage.updateUserSubscription(userId, {
    planType: "monthly_subscription",
    subscriptionStatus: "active",
    subscriptionExpiresAt: expiresAt
  });
}