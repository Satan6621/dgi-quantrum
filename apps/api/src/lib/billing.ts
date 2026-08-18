import { PrismaClient } from "@prisma/client";
import { safeParseJson } from "./helpers";
import { env } from "../env";

const prisma = new PrismaClient();

export interface Plan {
  id: string;
  name: string;
  price: number;
  distributors: number;
  leads: number;
  brain: number;
  keys: number;
  features: string[];
}

export const PLANS: Record<string, Plan> = {
  TRIAL: {
    id: "TRIAL",
    name: "Prueba gratuita",
    price: 0,
    distributors: 1,
    leads: 25,
    brain: 50,
    keys: 1,
    features: ["Hasta 1 distribuidor", "25 leads/mes", "50 ítems de cerebro", "Funnel público", "Prueba de 14 días"],
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    price: 29,
    distributors: 2,
    leads: 50,
    brain: 100,
    keys: 3,
    features: ["Hasta 2 distribuidores", "50 leads/mes", "100 ítems de cerebro", "Funnels públicos"],
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    price: 99,
    distributors: 15,
    leads: 1000,
    brain: 1000,
    keys: 10,
    features: ["Hasta 15 distribuidores", "1.000 leads/mes", "1.000 ítems de cerebro", "Webhooks + API", "Variantes A/B"],
  },
  SCALE: {
    id: "SCALE",
    name: "Scale",
    price: 299,
    distributors: Infinity,
    leads: Infinity,
    brain: Infinity,
    keys: Infinity,
    features: ["Distribuidores ilimitados", "Leads ilimitados", "Cerebro ilimitado", "Soporte prioritario"],
  },
};

export function getPlan(id: string): Plan {
  return PLANS[id] ?? PLANS.STARTER;
}

export class LimitError extends Error {
  public status = 402;
  constructor(msg: string) {
    super(msg);
  }
}

export async function usage(orgId: string) {
  const [distributors, leads, brain] = await Promise.all([
    prisma.distributor.count({ where: { orgId } }),
    prisma.lead.count({ where: { orgId } }),
    prisma.brainItem.count({ where: { orgId } }),
  ]);
  return { distributors, leads, brain };
}

export async function billingView(org: any) {
  const plan = getPlan(org.plan);
  const u = await usage(org.id);
  const billing = safeParseJson(org.billing, {});
  const invoices = await prisma.invoice.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return {
    plan: org.plan,
    planName: plan.name,
    price: plan.price,
    features: plan.features,
    limits: { distributors: plan.distributors, leads: plan.leads, brain: plan.brain },
    usage: u,
    atLimit: {
      distributors: u.distributors >= plan.distributors,
      leads: u.leads >= plan.leads,
      brain: u.brain >= plan.brain,
    },
    status: (billing as any).status ?? "TRIAL",
    periodEnd: (billing as any).periodEnd ?? null,
    invoices,
  };
}

export async function checkLimit(org: any, resource: "distributors" | "leads" | "brain" | "keys") {
  const plan = getPlan(org.plan);
  const u = await usage(org.id);
  const map: any = { distributors: u.distributors, leads: u.leads, brain: u.brain, keys: await prisma.apiKey.count({ where: { orgId: org.id } }) };
  const limit = plan[resource];
  if (map[resource] >= limit) {
    throw new LimitError(
      `Límite del plan ${org.plan} alcanzado: ${resource} (${map[resource]}/${limit}). Actualiza tu plan para continuar.`
    );
  }
}

/** Checkout: Stripe real si hay clave; si no, factura simulada. */
export async function createCheckout(org: any, planId: string) {
  const plan = getPlan(planId);
  const stripeKey = env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    const form = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": `NETWORK AI OS · ${plan.name}`,
      "line_items[0][price_data][unit_amount]": String(plan.price * 100),
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][quantity]": "1",
      success_url: `${env.APP_URL}/app/billing?success=1&plan=${planId}`,
      cancel_url: `${env.APP_URL}/app/billing?cancel=1`,
      "metadata[orgId]": org.id,
      "metadata[plan]": planId,
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data: any = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? "Error creando la sesión de pago");
    return { mode: "stripe", url: data.url, sessionId: data.id };
  }
  // Simulado
  await prisma.invoice.create({
    data: {
      orgId: org.id,
      plan: planId,
      amount: plan.price,
      currency: "usd",
      status: "PAID",
      description: `Suscripción mensual · ${plan.name}`,
    },
  });
  const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
  await prisma.organization.update({
    where: { id: org.id },
    data: { plan: planId, billing: JSON.stringify({ status: "ACTIVE", periodEnd, updatedAt: new Date().toISOString() }) },
  });
  return { mode: "simulate", url: null };
}