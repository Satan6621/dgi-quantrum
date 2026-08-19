import { prisma } from "./prisma";

const DEFAULT_SETTINGS = {
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
  channels: { whatsapp: { provider: "simulate", distributorSlug: "", webhookSecret: "" }, calcom: { apiKey: "", distributorSlug: "", webhookSecret: "" } },
};

/** Contenido genérico de arranque para una organización recién registrada. */
const STARTER_BRAIN: Array<{ category: string; title: string; content: string; keywords: string }> = [
  { category: "CORPORATE", title: "Sobre nuestra empresa", content: "Describe aquí la misión, la historia y la propuesta de tu organización. Este contenido será la fuente de verdad de los AI Twins.", keywords: "empresa misión historia" },
  { category: "VALUE_PROP", title: "Propuesta de valor", content: "Explica qué hace única tu oportunidad: formación, mentores, compensación transparente y comunidad. Edita este texto para tu organización.", keywords: "beneficios oportunidad compensación" },
  { category: "PRODUCT", title: "Productos y servicios", content: "Describe tus productos o servicios, sus beneficios y usos. No afirmes propiedades curativas ni prometas resultados.", keywords: "productos servicios beneficios" },
  { category: "POLICY", title: "Política de garantía y devolución", content: "Define la política de garantía y devolución de tu organización, plazos y condiciones.", keywords: "garantía devolución política" },
  { category: "POLICY", title: "Costo de inicio", content: "Detalla el costo de inicio, el kit de bienvenida y las cuotas mensuales, si existen. Sé transparente.", keywords: "precio costo inicio kit cuota" },
  { category: "FAQ", title: "¿Necesito experiencia previa?", content: "Define tu postura: la mayoría de las organizaciones no exigen experiencia y forman a los nuevos distribuidores.", keywords: "experiencia principiante formación" },
  { category: "FAQ", title: "¿Cuánto tiempo necesito dedicar?", content: "Define el tiempo mínimo recomendado y aclara que el crecimiento es progresivo.", keywords: "tiempo dedicación horario" },
  { category: "FAQ", title: "¿Cómo cobro mis comisiones?", content: "Explica el ciclo de pago de comisiones y el método de transferencia de tu organización.", keywords: "comisión pago dinero cobrar" },
  { category: "ELIGIBILITY", title: "Edad mínima", content: "Se requiere ser mayor de 18 años.", keywords: "edad mayor menor requisito" },
  { category: "ELIGIBILITY", title: "Perfil compatible", content: "Buscamos personas motivadas y dispuestas a formarse. No se requiere título ni experiencia previa.", keywords: "perfil requisitos motivación" },
  { category: "DISQUALIFICATION", title: "Menor de edad", content: "Los menores de 18 años no pueden registrarse como distribuidores.", keywords: "menor edad no apto" },
  { category: "DISQUALIFICATION", title: "Expectativas irrealistas", content: "No se permiten promesas de ingresos rápidos o garantizados. Descalifica si el prospecto espera dinero sin esfuerzo.", keywords: "rico rápido garantizado dinero fácil" },
  { category: "SCREENING", title: "¿Tienes más de 18 años?", content: "screening", keywords: "edad" },
  { category: "SCREENING", title: "¿Qué te motiva a buscar una oportunidad?", content: "screening", keywords: "motivación objetivo" },
  { category: "SCREENING", title: "¿Cuánto tiempo podrías dedicar semanalmente?", content: "screening", keywords: "tiempo disponibilidad" },
  { category: "SCREENING", title: "¿Estarías dispuesto a completar una formación inicial?", content: "screening", keywords: "formación disposición" },
  { category: "PROHIBITED_CLAIM", title: "Claims prohibidos", content: "Prohibido prometer ingresos garantizados, afirmar que los productos curan enfermedades o presentar el negocio como inversión financiera.", keywords: "prohibido promesa curaciones garantizado" },
  { category: "PROCESS", title: "Cómo unirse", content: "1) Conversa con tu asesor, 2) completa tu registro, 3) recibe tu kit, 4) activa tu AI Twin y tu funnel, 5) comienza tu formación.", keywords: "proceso pasos registro kit" },
  { category: "FOLLOW_UP", title: "Seguimiento tras la conversación", content: "Recuerda que te escribí para continuar nuestra conversación. Quedo disponible para resolver cualquier duda.", keywords: "seguimiento contacto duda" },
  { category: "ESCALATION", title: "Regla de escalamiento", content: "Cuando un prospecto alcanza ALTA INTENCIÓN, transfiere al distribuidor en menos de 24 horas. Si no responde, escala al manager.", keywords: "escalar manager handoff 24 horas" },
  { category: "OBJECTION", title: "Objeciones de precio", content: "Define el valor del kit y cómo se amortiza (sin cuotas obligatorias) para responder con claridad si el prospecto considera que es caro.", keywords: "caro precio costo inversión kit" },
  { category: "OBJECTION", title: "Objeciones de tiempo", content: "Define el tiempo mínimo recomendado a la semana y aclara que el ritmo lo marca el propio distribuidor.", keywords: "tiempo falta disponibilidad horario" },
  { category: "OBJECTION", title: "Objeciones de confianza", content: "Refuerza la legitimidad de la empresa, la transparencia de políticas y que el prospecto puede verificar antes de decidir.", keywords: "estafa fraude confianza dudas seguro" },
];

const STARTER_SEQUENCE_STEPS = [
  { delayDays: 1, title: "Primer contacto", content: "Hola {name}, soy {twin}. Quería continuar nuestra conversación. ¿Te quedó alguna duda sobre la oportunidad?" },
  { delayDays: 3, title: "Recurso educativo", content: "Hola {name}, te comparto el material de la formación inicial. ¿Te pareció útil?" },
  { delayDays: 6, title: "Recordatorio", content: "Hola {name}, en unos días cerramos el grupo de nuevas incorporaciones. ¿Te gustaría reservar tu lugar?" },
];

/**
 * Provisiona una organización recién creada con contenido de arranque:
 * brain, secuencia de nutrición y un AI Twin para su administrador.
 */
export async function provisionOrg(orgId: string, adminUserId: string, adminName: string) {
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { settings: JSON.stringify(DEFAULT_SETTINGS) },
  });

  await prisma.brainItem.createMany({
    data: STARTER_BRAIN.map((b) => ({ ...b, orgId })),
  });

  await prisma.sequenceTemplate.create({
    data: { orgId, name: "Secuencia NUTRICIÓN", trigger: "NUTRICION", steps: JSON.stringify(STARTER_SEQUENCE_STEPS), active: true },
  });

  const twin = await prisma.distributor.create({
    data: {
      orgId,
      userId: adminUserId,
      name: adminName,
      slug: org.slug,
      tone: "cercano y profesional",
      presentation: `Hola, soy ${adminName}. Te acompaño a conocer esta oportunidad paso a paso.`,
      language: "es",
      funnelEnabled: true,
    },
  });

  return { twinId: twin.id };
}
