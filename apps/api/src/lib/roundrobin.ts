import { PrismaClient } from "@prisma/client";
import { notifyDistributorOfLead } from "./telegram";

const prisma = new PrismaClient();

export interface RoundRobinConfig {
  enabled: boolean;
  maxLeadsPerDay: number;
  cooldownHours: number;
  strategy: "least_recent" | "round_robin" | "weighted";
  fallbackAction: "queue" | "notify_admin" | "rotate";
}

export interface DistributorPool {
  userId: string;
  name: string;
  email: string;
  telegramId?: string;
  lastAssignedAt?: Date;
  assignedToday: number;
  isActive: boolean;
  weight: number;
}

export interface AssignmentResult {
  success: boolean;
  distributorId?: string;
  distributorName?: string;
  leadId: string;
  reason?: string;
  queuePosition?: number;
}

// Get round robin configuration for organization
export async function getRoundRobinConfig(orgId: string): Promise<RoundRobinConfig> {
  const org = await prisma.org.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    return getDefaultConfig();
  }

  const settings = JSON.parse(org.settings as string || "{}");
  return {
    ...getDefaultConfig(),
    ...settings.roundRobin,
  };
}

// Update round robin configuration
export async function updateRoundRobinConfig(
  orgId: string,
  config: Partial<RoundRobinConfig>
): Promise<RoundRobinConfig> {
  const org = await prisma.org.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  const settings = JSON.parse(org.settings as string || "{}");
  const newConfig = {
    ...getDefaultConfig(),
    ...settings.roundRobin,
    ...config,
  };

  await prisma.org.update({
    where: { id: orgId },
    data: {
      settings: JSON.stringify({
        ...settings,
        roundRobin: newConfig,
      }),
    },
  });

  return newConfig;
}

// Get available distributors in the pool
export async function getDistributorPool(orgId: string): Promise<DistributorPool[]> {
  const users = await prisma.user.findMany({
    where: {
      orgId,
      role: "distributor",
      status: "active",
    },
  });

  const pool: DistributorPool[] = [];

  for (const user of users) {
    const assignedToday = await prisma.lead.count({
      where: {
        orgId,
        assignedTo: user.id,
        assignedAt: {
          gte: getStartOfDay(),
        },
      },
    });

    const lastAssigned = await prisma.lead.findFirst({
      where: {
        orgId,
        assignedTo: user.id,
      },
      orderBy: {
        assignedAt: "desc",
      },
      select: {
        assignedAt: true,
      },
    });

    pool.push({
      userId: user.id,
      name: user.name,
      email: user.email,
      telegramId: user.telegramId || undefined,
      lastAssignedAt: lastAssigned?.assignedAt || undefined,
      assignedToday,
      isActive: true,
      weight: 1,
    });
  }

  return pool;
}

// Select next distributor based on strategy
export function selectDistributor(
  pool: DistributorPool[],
  config: RoundRobinConfig,
  lastAssignedIndex?: number
): DistributorPool | null {
  const available = pool.filter((d) => {
    if (!d.isActive) return false;
    if (d.assignedToday >= config.maxLeadsPerDay) return false;
    if (d.lastAssignedAt) {
      const hoursSinceLastAssignment =
        (Date.now() - d.lastAssignedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAssignment < config.cooldownHours) return false;
    }
    return true;
  });

  if (available.length === 0) return null;

  switch (config.strategy) {
    case "least_recent":
      return selectLeastRecent(available);
    case "round_robin":
      return selectRoundRobin(available, lastAssignedIndex);
    case "weighted":
      return selectWeighted(available);
    default:
      return selectLeastRecent(available);
  }
}

// Strategy: Select distributor with oldest assignment
function selectLeastRecent(pool: DistributorPool[]): DistributorPool {
  return pool.reduce((oldest, current) => {
    if (!oldest.lastAssignedAt) return oldest;
    if (!current.lastAssignedAt) return current;
    return current.lastAssignedAt < oldest.lastAssignedAt ? current : oldest;
  });
}

// Strategy: Round robin rotation
function selectRoundRobin(
  pool: DistributorPool[],
  lastIndex?: number
): DistributorPool {
  const index = lastIndex !== undefined ? (lastIndex + 1) % pool.length : 0;
  return pool[index];
}

// Strategy: Weighted selection
function selectWeighted(pool: DistributorPool[]): DistributorPool {
  const totalWeight = pool.reduce((sum, d) => sum + d.weight, 0);
  let random = Math.random() * totalWeight;

  for (const distributor of pool) {
    random -= distributor.weight;
    if (random <= 0) return distributor;
  }

  return pool[0];
}

// Assign lead to distributor
export async function assignLead(
  orgId: string,
  leadId: string
): Promise<AssignmentResult> {
  const config = await getRoundRobinConfig(orgId);

  if (!config.enabled) {
    return {
      success: false,
      leadId,
      reason: "Round robin is disabled",
    };
  }

  // Check if lead already assigned
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return {
      success: false,
      leadId,
      reason: "Lead not found",
    };
  }

  if (lead.assignedTo) {
    return {
      success: false,
      leadId,
      reason: "Lead already assigned",
    };
  }

  // Get distributor pool
  const pool = await getDistributorPool(orgId);
  const distributor = selectDistributor(pool, config);

  if (!distributor) {
    // Handle fallback
    return await handleFallback(orgId, leadId, config);
  }

  // Assign lead
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      assignedTo: distributor.userId,
      assignedAt: new Date(),
      status: "assigned",
    },
  });

  // Notify distributor
  await notifyDistributorOfLead(distributor.userId, lead, orgId);

  return {
    success: true,
    distributorId: distributor.userId,
    distributorName: distributor.name,
    leadId,
  };
}

// Handle fallback when no distributors available
async function handleFallback(
  orgId: string,
  leadId: string,
  config: RoundRobinConfig
): Promise<AssignmentResult> {
  switch (config.fallbackAction) {
    case "queue":
      return {
        success: false,
        leadId,
        reason: "No distributors available, lead queued",
        queuePosition: await getQueuePosition(orgId),
      };
    case "notify_admin":
      await notifyAdminNoDistributors(orgId, leadId);
      return {
        success: false,
        leadId,
        reason: "No distributors available, admin notified",
      };
    case "rotate":
      // Force rotation by ignoring cooldown
      const pool = await getDistributorPool(orgId);
      const forcedDistributor = pool[0];
      if (forcedDistributor) {
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            assignedTo: forcedDistributor.userId,
            assignedAt: new Date(),
            status: "assigned",
          },
        });
        return {
          success: true,
          distributorId: forcedDistributor.userId,
          distributorName: forcedDistributor.name,
          leadId,
        };
      }
      return {
        success: false,
        leadId,
        reason: "No distributors available",
      };
    default:
      return {
        success: false,
        leadId,
        reason: "No distributors available",
      };
  }
}

// Get queue position for lead
async function getQueuePosition(orgId: string): Promise<number> {
  return prisma.lead.count({
    where: {
      orgId,
      status: "new",
      assignedTo: null,
    },
  });
}

// Notify admin when no distributors available
async function notifyAdminNoDistributors(orgId: string, leadId: string): Promise<void> {
  const org = await prisma.org.findUnique({
    where: { id: orgId },
  });

  if (!org) return;

  const admin = await prisma.user.findFirst({
    where: {
      orgId,
      role: "admin",
    },
  });

  if (!admin) return;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) return;

  // Send email notification to admin
  console.log(`Admin notified: No distributors available for lead ${leadId} in org ${orgId}`);
}

// Get round robin statistics
export async function getRoundRobinStats(orgId: string) {
  const config = await getRoundRobinConfig(orgId);
  const pool = await getDistributorPool(orgId);

  const todayAssignments = await prisma.lead.count({
    where: {
      orgId,
      assignedAt: {
        gte: getStartOfDay(),
      },
    },
  });

  const pendingLeads = await prisma.lead.count({
    where: {
      orgId,
      status: "new",
      assignedTo: null,
    },
  });

  return {
    config,
    pool: pool.map((d) => ({
      name: d.name,
      assignedToday: d.assignedToday,
      lastAssignedAt: d.lastAssignedAt,
      isAvailable: d.assignedToday < config.maxLeadsPerDay,
    })),
    todayAssignments,
    pendingLeads,
  };
}

// Get start of today
function getStartOfDay(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// Default configuration
function getDefaultConfig(): RoundRobinConfig {
  return {
    enabled: true,
    maxLeadsPerDay: 10,
    cooldownHours: 24,
    strategy: "least_recent",
    fallbackAction: "queue",
  };
}
