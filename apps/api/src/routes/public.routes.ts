import { Router } from "express";
import { prisma } from "../lib/prisma";
import { runChat } from "../lib/conversation";
import { safeParseJson, asyncHandler } from "../lib/helpers";

const r = Router();

/** Perfil público del funnel: organización + twin + catálogo + FAQs */
r.get(
  "/f/:slug",
  asyncHandler(async (req, res) => {
    const twin = await prisma.distributor.findFirst({
      where: { slug: req.params.slug, funnelEnabled: true, status: "ACTIVE" },
    });
    if (!twin) return res.status(404).json({ error: "Funnel no encontrado" });

    const org = await prisma.organization.findUnique({ where: { id: twin.orgId } });
    if (!org) return res.status(404).json({ error: "Funnel no encontrado" });

    const brain = await prisma.brainItem.findMany({ where: { orgId: org.id, active: true } });
    const catalog = brain.filter((b) => ["PRODUCT", "VALUE_PROP"].includes(b.category)).map((b) => ({
      category: b.category,
      title: b.title,
      content: b.content,
    }));
    const faqs = brain.filter((b) => b.category === "FAQ").slice(0, 6).map((b) => ({
      title: b.title,
      content: b.content,
    }));
    const screeningCount = brain.filter((b) => b.category === "SCREENING").length;
    const settings = safeParseJson<any>(org.settings, {});
    const funnelSteps: string[] = settings.funnelSteps ?? ["TRÁFICO", "INFORMADO", "COMPATIBLE", "ALTA INTENCIÓN", "ONBOARDING", "ACTIVADO"];

    const variants = safeParseJson<any[]>(twin.variants, []);
    const variantId = req.query.v ? String(req.query.v) : null;
    const variant = variantId ? variants.find((v) => v.id === variantId) ?? null : null;
    const tone = variant?.tone ?? twin.tone;
    const presentation = variant?.presentation ?? twin.presentation;

    res.json({
      org: { id: org.id, name: org.name, slug: org.slug, primaryColor: org.primaryColor, logoUrl: org.logoUrl },
      twin: {
        id: twin.id,
        name: twin.name,
        slug: twin.slug,
        avatarUrl: twin.avatarUrl,
        tone,
        presentation,
        language: twin.language,
        zone: twin.zone,
        whatsapp: twin.whatsapp,
        calendarUrl: twin.calendarUrl,
        socialLinks: safeParseJson(twin.socialLinks, {}),
        availability: safeParseJson(twin.availability, {}),
      },
      variant: variant ? { id: variant.id, name: variant.name, tone, presentation } : null,
      variants: variants.map((v) => ({ id: v.id, name: v.name, weight: v.weight })),
      catalog,
      faqs,
      screeningCount,
      funnelSteps,
    });
  })
);

/** Conversación IA (widget del funnel público) */
r.post(
  "/f/:slug/chat",
  asyncHandler(async (req, res) => {
    const { message, sessionId, leadId, variantId } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }
    const result = await runChat({
      slug: req.params.slug,
      userText: String(message).slice(0, 500),
      sessionId,
      leadId,
      variantId: variantId ?? null,
    });
    res.json(result);
  })
);

export default r;