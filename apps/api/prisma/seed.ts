import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  "CORPORATE",
  "PRODUCT",
  "VALUE_PROP",
  "POLICY",
  "FAQ",
  "ELIGIBILITY",
  "DISQUALIFICATION",
  "SCREENING",
  "ARGUMENT",
  "PROHIBITED_CLAIM",
  "PROCESS",
  "FOLLOW_UP",
  "ESCALATION",
  "OBJECTION",
];

const ORG_SETTINGS = {
  thresholds: { highIntent: 5, nutrition: 2 },
  slaHours: 24,
  onboardingChecklist: [
    "Confirmar datos de contacto",
    "Revisar y aceptar el código de conducta",
    "Ver material de capacitación inicial",
    "Configurar su perfil público y enlaces",
    "Primer contacto con su mentor",
    "Activar su AI Twin y recibir su funnel",
  ],
  funnelSteps: [
    "TRÁFICO",
    "INFORMADO",
    "COMPATIBLE",
    "ALTA INTENCIÓN",
    "ONBOARDING",
    "ACTIVADO",
  ],
  compensation: { direct: 15, level1: 5, level2: 2, base: 100 },
  channels: {
    whatsapp: { provider: "simulate", distributorSlug: "maria-gonzalez", webhookSecret: "" },
    calcom: { apiKey: "", distributorSlug: "maria-gonzalez" },
  },
};

const BRAIN: Array<{ category: string; title: string; content: string; keywords: string }> = [
  {
    category: "CORPORATE",
    title: "Quiénes somos",
    content:
      "Vida Nova es una comunidad internacional de bienestar y desarrollo personal. Ayudamos a miles de personas a mejorar su calidad de vida a través de productos naturales y un modelo de oportunidades económicas. Fundada hace 12 años, presente en 15 países.",
    keywords: "empresa compañía misión historia comunidad bienestar oportunidades",
  },
  {
    category: "VALUE_PROP",
    title: "Nuestra propuesta de valor",
    content:
      "Únete a una comunidad en crecimiento con productos probados, formación continua, mentores dedicados y un modelo de compensación transparente. No necesitas experiencia previa: te entrenamos paso a paso.",
    keywords: "beneficios oportunidad compensación formación mentores transparente",
  },
  {
    category: "PRODUCT",
    title: "Línea Bienestar Diario",
    content:
      "Suplementos nutricionales naturales formulados con ingredientes certificados. Incluye vitaminas, probióticos y colágeno. No son medicamentos y no curan ni tratan enfermedades.",
    keywords: "vitaminas suplementos probióticos colágeno nutrición salud natural",
  },
  {
    category: "PRODUCT",
    title: "Línea Energía Vital",
    content:
      "Bebidas energéticas naturales sin azúcar añadido y mezclas de té verde. Para complementar un estilo de vida activo. Información nutricional disponible en cada envase.",
    keywords: "bebidas energía té verde activo sin azúcar",
  },
  {
    category: "POLICY",
    title: "Política de garantía y devolución",
    content:
      "Todos los productos cuentan con 30 días de garantía de satisfacción. El cliente puede solicitar devolución o cambio si el producto no cumple las expectativas. Sin preguntas incómodas.",
    keywords: "garantía devolución reembolso cambio satisfacción",
  },
  {
    category: "POLICY",
    title: "Costo de inicio",
    content:
      "El kit de inicio tiene un costo único accesible que incluye productos de muestra, materiales de formación y acceso a la plataforma. No hay cuotas mensuales obligatorias.",
    keywords: "precio costo inicio kit membresía cuota",
  },
  {
    category: "FAQ",
    title: "¿Necesito experiencia en ventas?",
    content:
      "No. Más del 60% de nuestros distribuidores activos comenzaron sin experiencia. El sistema de formación, los mentores y tu AI personal te acompañan en cada paso.",
    keywords: "experiencia ventas principiante empezar formación",
  },
  {
    category: "FAQ",
    title: "¿Cuánto tiempo necesito dedicar?",
    content:
      "Puedes comenzar con 2-3 horas semanales. Tu dedicación la decides tú. Muchos distribuidores comparten el negocio como actividad complementaria.",
    keywords: "tiempo horas dedicación horario part time",
  },
  {
    category: "FAQ",
    title: "¿Cómo cobro mis comisiones?",
    content:
      "Las comisiones se calculan cada quincena sobre las ventas personales y de tu red, según el plan de compensación publicado. El pago se realiza por transferencia bancaria.",
    keywords: "comisión pago dinero cobrar compensación transferencia",
  },
  {
    category: "FAQ",
    title: "¿Esto es legal en mi país?",
    content:
      "Sí. Operamos bajo un modelo de venta directa autorizado, con políticas de transparencia y cumplimiento. Puedes revisar nuestra documentación legal al registrarte.",
    keywords: "legal ley direct selling regulación transparencia",
  },
  {
    category: "ELIGIBILITY",
    title: "Edad mínima",
    content: "Se requiere ser mayor de 18 años.",
    keywords: "edad mayor menor 18 requisito",
  },
  {
    category: "ELIGIBILITY",
    title: "Perfil compatible",
    content:
      "Buscamos personas motivadas, honestas y dispuestas a formarse. No se requiere título ni experiencia previa.",
    keywords: "perfil requisitos motivación compromiso",
  },
  {
    category: "DISQUALIFICATION",
    title: "Edad insuficiente",
    content: "Los menores de 18 años no pueden registrarse como distribuidores.",
    keywords: "menor de edad 17 no apto",
  },
  {
    category: "DISQUALIFICATION",
    title: "Expectativas irrealistas",
    content:
      "No se permite prometer ingresos rápidos o garantizados. Si el prospecto espera enriquecerse sin esfuerzo, se descalifica amablemente.",
    keywords: "rico rápido garantizado pasivo sin esfuerzo dinero fácil",
  },
  {
    category: "SCREENING",
    title: "¿Tienes más de 18 años?",
    content: "screening",
    keywords: "edad",
  },
  {
    category: "SCREENING",
    title: "¿Qué te motiva a buscar una oportunidad?",
    content: "screening",
    keywords: "motivación objetivo",
  },
  {
    category: "SCREENING",
    title: "¿Cuánto tiempo podrías dedicar semanalmente?",
    content: "screening",
    keywords: "tiempo disponibilidad",
  },
  {
    category: "SCREENING",
    title: "¿Estarías dispuesto a completar una formación inicial?",
    content: "screening",
    keywords: "formación disposición",
  },
  {
    category: "ARGUMENT",
    title: "Argumento principal",
    content:
      "Tú decides cuánto creces: productos reales, formación real y una comunidad real. Sin cuotas ocultas y con mentores dedicados.",
    keywords: "argumento beneficios crecimiento comunidad",
  },
  {
    category: "PROHIBITED_CLAIM",
    title: "Claims prohibidos",
    content:
      "Prohibido prometer ingresos garantizados, afirmar que los productos curan enfermedades, o presentar el negocio como una inversión financiera.",
    keywords: "prohibido promesa curaciones inversión garantizado",
  },
  {
    category: "PROCESS",
    title: "Cómo unirse",
    content:
      "1) Conversa con tu asesor, 2) completa tu registro, 3) recibe tu kit de inicio, 4) activa tu AI Twin y tu funnel, 5) comienza tu formación.",
    keywords: "proceso pasos unirse registro kit",
  },
  {
    category: "FOLLOW_UP",
    title: "Seguimiento tras la conversación",
    content:
      "Recuerda que te escribí para continuar nuestra conversación. Quedo disponible para resolver cualquier duda y darte acceso a la formación inicial.",
    keywords: "seguimiento contacto duda formación",
  },
  {
    category: "ESCALATION",
    title: "Regla de escalamiento",
    content:
      "Cuando un prospecto alcanza nivel ALTA INTENCIÓN, debe transferirse al distribuidor en menos de 24 horas. Si el distribuidor no responde en 24 horas, se escala al manager.",
    keywords: "escalar manager handoff respuesta 24 horas",
  },
  {
    category: "OBJECTION",
    title: "Objeciones de precio",
    content:
      "El kit de inicio tiene un valor de 100 USD e incluye productos y material de formación. La inversión se recupera con la primera venta, y no hay cuotas obligatorias. Podemos revisar un plan de pago si lo necesitas.",
    keywords: "caro precio costo inversión kit pagos",
  },
  {
    category: "OBJECTION",
    title: "Objeciones de tiempo",
    content:
      "Entendemos la falta de tiempo: la formación inicial toma unas horas a la semana y tú marcas el ritmo. Muchos distribuidores empiezan con 3-5 horas semanales y crecen progresivamente.",
    keywords: "tiempo falta disponibilidad horario dedicación",
  },
  {
    category: "OBJECTION",
    title: "Objeciones de confianza",
    content:
      "Es normal tener dudas con una oportunidad nueva. Somos una empresa establecida con políticas transparentes y garantía de devolución; puedes verificar la información oficial y hablar con distribuidores activos antes de decidir.",
    keywords: "estafa fraude confianza dudas seguro garantía",
  },
];

const NUTRI_SEQUENCE_STEPS = [
  { delayDays: 1, title: "Primer contacto", content: "Hola {name}, soy {twin}. Quería continuar nuestra conversación de la semana. ¿Te quedó alguna duda sobre la oportunidad?" },
  { delayDays: 3, title: "Recurso educativo", content: "Hola {name}, te comparto el material de la formación inicial. Es de 20 minutos y responde todas tus preguntas. ¿Te pareció útil?" },
  { delayDays: 6, title: "Recordatorio", content: "Hola {name}, en unos días cerramos el grupo de nuevas incorporaciones. ¿Te gustaría reservar tu lugar y revisar juntos los siguientes pasos?" },
];

const DEMO_LEADS = [
  { name: "Carlos Mendoza", email: "carlos.mendoza@mail.com", phone: "+5215544332211", score: 7, status: "HANDOFF", outcome: "ALTA_INTENCION", intentLevel: "HIGH", source: "funnel", handoffAfterHours: 2 },
  { name: "Laura Fernández", email: "laura.fer@mail.com", phone: "+5219988776655", score: 4, status: "NUTRITION", outcome: "NUTRICION", intentLevel: "MEDIUM", source: "funnel" },
  { name: "Pedro Salas", email: "pedro.salas@mail.com", score: 2, status: "IN_CONVERSATION", outcome: null, intentLevel: "MEDIUM", source: "referral" },
  { name: "Ana Torres", email: "ana.torres@mail.com", score: 8, status: "ONBOARDING", outcome: "ALTA_INTENCION", intentLevel: "HIGH", source: "funnel", handoffAfterHours: 3 },
  { name: "Jorge Ruiz", email: "jorge.ruiz@mail.com", score: 6, status: "DISTRIBUTOR", outcome: "ONBOARDED", intentLevel: "HIGH", source: "funnel", handoffAfterHours: 5, activationAfterHours: 24 },
  { name: "Sofía Cruz", email: "sofia.cruz@mail.com", score: -3, status: "DISQUALIFIED", outcome: "NO_APTO", intentLevel: "LOW", source: "funnel" },
  { name: "Miguel Ángel Paredes", email: "map@mail.com", score: 5, status: "NUTRITION", outcome: "NUTRICION", intentLevel: "MEDIUM", source: "whatsapp" },
];

async function main() {
  console.log("Seeding DGI Quantrum demo...");

  const existing = await prisma.organization.findUnique({ where: { slug: "vida-nova" } });
  if (existing) {
    console.log("Demo ya existe. Limpiando para reseed...");
    await prisma.onboardingTask.deleteMany({ where: { orgId: existing.id } });
    await prisma.followUp.deleteMany({ where: { orgId: existing.id } });
    await prisma.message.deleteMany({});
    await prisma.session.deleteMany({ where: { orgId: existing.id } });
    await prisma.lead.deleteMany({ where: { orgId: existing.id } });
    await prisma.commission.deleteMany({ where: { orgId: existing.id } });
    await prisma.notification.deleteMany({ where: { orgId: existing.id } });
    await prisma.distributor.deleteMany({ where: { orgId: existing.id } });
    await prisma.sequenceTemplate.deleteMany({ where: { orgId: existing.id } });
    await prisma.brainItem.deleteMany({ where: { orgId: existing.id } });
    const orgUserIds = (await prisma.user.findMany({ where: { orgId: existing.id }, select: { id: true } })).map((u) => u.id);
    await prisma.refreshToken.deleteMany({ where: { userId: { in: orgUserIds } } });
    await prisma.auditLog.deleteMany({ where: { orgId: existing.id } });
    await prisma.user.deleteMany({ where: { orgId: existing.id } });
    await prisma.apiKey.deleteMany({ where: { orgId: existing.id } });
    await prisma.invoice.deleteMany({ where: { orgId: existing.id } });
    await prisma.webhookLog.deleteMany({ where: { orgId: existing.id } });
    await prisma.organization.deleteMany({ where: { id: existing.id } });
  }

  const org = await prisma.organization.create({
    data: {
      name: "Vida Nova",
      slug: "vida-nova",
      logoUrl: "",
      primaryColor: "#6d28d9",
      settings: JSON.stringify(ORG_SETTINGS),
    },
  });

  const adminHash = await hash("demo1234", 10);
  const admin = await prisma.user.create({
    data: { orgId: org.id, role: "ADMIN", email: "admin@vida-nova.demo", name: "Adriana Ortega", passwordHash: adminHash },
  });

  const distHash = await hash("demo1234", 10);
  const distUser = await prisma.user.create({
    data: {
      orgId: org.id,
      role: "DISTRIBUTOR",
      email: "distributor@vida-nova.demo",
      name: "María González",
      passwordHash: distHash,
    },
  });

  const twin = await prisma.distributor.create({
    data: {
      orgId: org.id,
      userId: distUser.id,
      name: "María González",
      slug: "maria-gonzalez",
      tone: "cercano y profesional",
      presentation:
        "Hola, soy María. Ayudo a personas a mejorar su bienestar y construir ingresos complementarios desde casa, con un acompañamiento real, paso a paso.",
      language: "es",
      zone: "América Latina",
      whatsapp: "https://wa.me/5215533445566",
      calendarUrl: "https://cal.com/maria-gonzalez",
      socialLinks: JSON.stringify({ instagram: "https://instagram.com/maria.gonzalez", facebook: "https://facebook.com/maria.gonzalez", tiktok: "https://tiktok.com/@maria.gonzalez" }),
      availability: JSON.stringify({ days: ["L", "M", "X", "J", "V"], hours: "09:00-19:00" }),
      funnelEnabled: true,
    },
  });

  await prisma.brainItem.createMany({
    data: BRAIN.map((b) => ({ ...b, orgId: org.id })),
  });

  await prisma.sequenceTemplate.create({
    data: {
      orgId: org.id,
      name: "Secuencia NUTRICIÓN",
      trigger: "NUTRICION",
      steps: JSON.stringify(NUTRI_SEQUENCE_STEPS),
      active: true,
    },
  });

  const leadIds: string[] = [];
  for (const [i, l] of DEMO_LEADS.entries()) {
    const { handoffAfterHours, activationAfterHours, ...rest } = l;
    const firstSeen = new Date(Date.now() - (i + 1) * 86400000);
    const lead = await prisma.lead.create({
      data: {
        orgId: org.id,
        distributorId: twin.id,
        ...rest,
        firstSeen,
        lastActivity: new Date(Date.now() - i * 86400000),
        ...(handoffAfterHours ? { handoffAt: new Date(firstSeen.getTime() + handoffAfterHours * 3600000) } : {}),
        ...(activationAfterHours ? { activatedAt: new Date(firstSeen.getTime() + (handoffAfterHours + activationAfterHours) * 3600000) } : {}),
      },
    });
    leadIds.push(lead.id);

    if (l.status === "NUTRITION") {
      const tmpl = await prisma.sequenceTemplate.findFirst({ where: { orgId: org.id, trigger: "NUTRICION" } });
      const steps = JSON.parse(tmpl!.steps);
      steps.forEach(async (s: any, idx: number) => {
        await prisma.followUp.create({
          data: {
            orgId: org.id,
            leadId: lead.id,
            templateId: tmpl!.id,
            stepIndex: idx,
            title: s.title,
            content: s.content.replace("{name}", l.name).replace("{twin}", twin.name),
            channel: "whatsapp",
            dueAt: new Date(Date.now() + (idx + 1) * 86400000),
            status: idx === 0 ? "SENT" : "PENDING",
            ...(idx === 0 ? { sentAt: new Date(Date.now() - 3600000) } : {}),
          },
        });
      });
    }

    if (l.status === "ONBOARDING") {
      const checklist = (ORG_SETTINGS as any).onboardingChecklist as string[];
      for (const [idx, t] of checklist.entries()) {
        await prisma.onboardingTask.create({
          data: { orgId: org.id, leadId: lead.id, title: t, order: idx, completed: idx < 2 },
        });
      }
    }

    if (l.status === "DISTRIBUTOR") {
      const checklist = (ORG_SETTINGS as any).onboardingChecklist as string[];
      for (const [idx, t] of checklist.entries()) {
        await prisma.onboardingTask.create({
          data: { orgId: org.id, leadId: lead.id, title: t, order: idx, completed: true },
        });
      }
    }
  }

  const session = await prisma.session.create({
    data: {
      orgId: org.id,
      distributorId: twin.id,
      leadId: leadIds[0],
      meta: JSON.stringify({ stage: "SCREENING", q: 3, answers: [{ q: "¿Tienes más de 18 años?", a: "sí" }, { q: "¿Qué te motiva?", a: "crecer y ayudar a mi familia" }, { q: "¿Cuánto tiempo?", a: "5 horas semanales" }], score: 7, done: true }),
      messages: {
        create: [
          { role: "USER", content: "Hola, me llamo Carlos y quiero saber más sobre la oportunidad.", score: 0, tags: "intro" },
          { role: "AI", content: "¡Hola Carlos! Soy María, encantada. Te cuento: en Vida Nova podrás mejorar tu bienestar con productos naturales y generar ingresos complementarios. ¿Eres mayor de 18 años?", score: 0, tags: "screening" },
          { role: "USER", content: "Sí, tengo 29. ¿Qué necesito para empezar?", score: 3, tags: "positive" },
          { role: "AI", content: "Perfecto. Solo necesitas el kit de inicio, ganas de aprender y unas 3-5 horas semanales. ¿Cuánto tiempo podrías dedicar?", score: 3, tags: "screening" },
          { role: "USER", content: "Puedo dedicar 5 horas. Me interesa mucho, ¿cómo me uno?", score: 6, tags: "positive" },
          { role: "AI", content: "¡Excelente Carlos! Estás listo para el siguiente paso. Te comparto mi WhatsApp y mi agenda para que agendemos tu incorporación: {wa} · {cal}.", score: 7, tags: "handoff" },
        ],
      },
    },
  });
  void session;

  /* ================= FASE 2: downline, compensación, gamificación ================= */

  async function makeDistributor(name: string, email: string, slug: string, sponsorId: string | null, extra: any = {}) {
    const u = await prisma.user.create({
      data: { orgId: org.id, role: "DISTRIBUTOR", email, name, passwordHash: await hash("demo1234", 10) },
    });
    return prisma.distributor.create({
      data: {
        orgId: org.id,
        userId: u.id,
        name,
        slug,
        tone: "cercano y profesional",
        presentation: `Hola, soy ${name}. Te acompaño a conocer esta oportunidad paso a paso.`,
        sponsorId,
        ...extra,
      },
    });
  }

  const juan = await makeDistributor("Juan Pérez", "juan@vida-nova.demo", "juan-perez", twin.id, {
    points: 430,
    level: "SILVER",
    commissionBalance: 25,
    badges: JSON.stringify(["networker", "primer-lead", "activacion-1"]),
  });
  const pedro = await makeDistributor("Pedro Salas", "pedro@vida-nova.demo", "pedro-salas", juan.id, {
    points: 170,
    level: "BRONZE",
    commissionBalance: 10,
    badges: JSON.stringify(["primer-lead"]),
  });
  const lucia = await makeDistributor("Lucía Romero", "lucia@vida-nova.demo", "lucia-romero", juan.id, {
    points: 260,
    level: "SILVER",
    badges: JSON.stringify(["networker", "primer-lead"]),
  });
  await makeDistributor("Andrés Lima", "andres@vida-nova.demo", "andres-lima", pedro.id, { points: 40 });

  const now = Date.now();
  await prisma.commission.createMany({
    data: [
      { orgId: org.id, distributorId: twin.id, leadId: null, type: "DIRECT", amount: 15, description: "Comisión directa · activación de Juan Pérez", createdAt: new Date(now - 12 * 86400000) },
      { orgId: org.id, distributorId: juan.id, leadId: null, type: "DIRECT", amount: 15, description: "Comisión directa · activación de Pedro Salas", createdAt: new Date(now - 9 * 86400000) },
      { orgId: org.id, distributorId: juan.id, leadId: null, type: "DIRECT", amount: 15, description: "Comisión directa · activación de Lucía Romero", createdAt: new Date(now - 6 * 86400000) },
      { orgId: org.id, distributorId: twin.id, leadId: null, type: "LEVEL1", amount: 10, description: "Comisión nivel 1 · activación de Pedro Salas", createdAt: new Date(now - 9 * 86400000) },
      { orgId: org.id, distributorId: pedro.id, leadId: null, type: "DIRECT", amount: 15, description: "Comisión directa · activación de Andrés Lima", createdAt: new Date(now - 2 * 86400000) },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { orgId: org.id, distributorId: twin.id, type: "handoff", title: "Nuevo lead de alta intención 🔥", body: "Carlos Mendoza respondió el funnel y está listo para agendar.", link: "/app/leads", createdAt: new Date(now - 3600000) },
      { orgId: org.id, distributorId: twin.id, type: "commission", title: "Comisión recibida 💰", body: "+$15.00 por la activación de Juan Pérez.", link: "/app/downline", createdAt: new Date(now - 12 * 86400000) },
      { orgId: org.id, distributorId: juan.id, type: "commission", title: "Comisión recibida 💰", body: "+$15.00 por la activación de Lucía Romero.", link: "/app/downline", createdAt: new Date(now - 6 * 86400000) },
      { orgId: org.id, distributorId: juan.id, type: "network", title: "Tu red creció 🌱", body: "Andrés Lima se unió patrocinado por Pedro.", link: "/app/downline", createdAt: new Date(now - 2 * 86400000) },
      { orgId: org.id, distributorId: null, type: "system", title: "Demo lista 🚀", body: "Tu organización tiene todo configurado. Prueba el funnel y activa leads.", link: "/app", createdAt: new Date(now - 86400000) },
    ],
  });

  await prisma.apiKey.create({
    data: {
      orgId: org.id,
      name: "Integración demo",
      keyPrefix: "naio_vida_nova_",
      keyHash: "demo-hash", // solo demo: usa el formato real al crear desde el panel
      scopes: JSON.stringify(["leads:read", "analytics:read", "brain:read"]),
    },
  });

  await prisma.invoice.createMany({
    data: [
      { orgId: org.id, plan: "STARTER", amount: 0, currency: "usd", status: "PAID", description: "Periodo de prueba · Starter", createdAt: new Date(now - 20 * 86400000) },
      { orgId: org.id, plan: "GROWTH", amount: 99, currency: "usd", status: "PAID", description: "Suscripción mensual · Growth", createdAt: new Date(now - 3 * 86400000) },
    ],
  });

  await prisma.webhookLog.create({
    data: {
      orgId: org.id,
      provider: "whatsapp",
      payload: JSON.stringify({ from: "+5215512345678", body: "Hola, quiero información" }),
      status: "processed",
      createdAt: new Date(now - 1800000),
    },
  });

  await prisma.organization.update({
    where: { id: org.id },
    data: { plan: "GROWTH", billing: JSON.stringify({ status: "ACTIVE", periodEnd: new Date(now + 27 * 86400000), updatedAt: new Date(now - 3 * 86400000) }) },
  });

  console.log("Seed completo ✓");
  console.log("  Admin:        admin@vida-nova.demo / demo1234");
  console.log("  Distribuidor: distributor@vida-nova.demo / demo1234");
  console.log("  Funnel:       /f/maria-gonzalez");
  console.log(`  Categorías del cerebro: ${CATEGORIES.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());