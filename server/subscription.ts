import { storage } from "./storage";

export interface SubscriptionStatus {
  canCreateCases: boolean;
  planType: string;
  status: string;
  message?: string;
  strategyPacksRemaining?: number;
  canUpgradeToMonthly?: boolean;
  hasInitialStrategyPack?: boolean;
}

export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const user = await storage.getUser(userId);
  
  if (!user) {
    return {
      canCreateCases: false,
      planType: "none",
      status: "no_user",
      message: "User not found",
      canUpgradeToMonthly: false,
      hasInitialStrategyPack: false
    };
  }

  // Check if user has ever purchased the initial strategy pack
  const hasInitialStrategyPack = user.hasInitialStrategyPack || false;

  // Check monthly subscription first
  if (user.planType === "monthly_subscription" && user.subscriptionStatus === "active" && hasInitialStrategyPack) {
    // Check if subscription is still valid
    if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date()) {
      return {
        canCreateCases: true,
        planType: "monthly_subscription",
        status: "active",
        message: "Active monthly subscription - unlimited cases",
        canUpgradeToMonthly: false,
        hasInitialStrategyPack: true
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
      strategyPacksRemaining: user.strategyPacksRemaining || undefined,
      canUpgradeToMonthly: hasInitialStrategyPack,
      hasInitialStrategyPack
    };
  }

  // User has purchased initial strategy pack but no remaining credits
  if (hasInitialStrategyPack) {
    return {
      canCreateCases: false,
      planType: user.planType || "strategy_pack",
      status: "expired",
      message: "Strategy packs used up. Upgrade to monthly subscription for unlimited cases.",
      canUpgradeToMonthly: true,
      hasInitialStrategyPack: true
    };
  }

  // No strategy pack purchased yet
  return {
    canCreateCases: false,
    planType: "none",
    status: "none",
    message: "Purchase the $299 strategy pack to get started, then optionally upgrade to monthly subscription.",
    canUpgradeToMonthly: false,
    hasInitialStrategyPack: false
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
  const isFirstPurchase = !user.hasInitialStrategyPack;
  
  await storage.updateUserSubscription(userId, {
    planType: "strategy_pack",
    strategyPacksRemaining: currentPacks + count,
    hasInitialStrategyPack: true
  });
}

export async function activateMonthlySubscription(userId: string): Promise<void> {
  const user = await storage.getUser(userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user has purchased the initial $299 strategy pack
  if (!user.hasInitialStrategyPack) {
    throw new Error("Must purchase the $299 strategy pack before upgrading to monthly subscription");
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await storage.updateUserSubscription(userId, {
    planType: "monthly_subscription",
    subscriptionStatus: "active",
    subscriptionExpiresAt: expiresAt
  });
}