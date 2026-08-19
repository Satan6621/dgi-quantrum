const BRAND = {
  primary: "#6d28d9",
  primaryLight: "#8b5cf6",
  bg: "#f9fafb",
  cardBg: "#ffffff",
  text: "#1f2937",
  textLight: "#6b7280",
  border: "#e5e7eb",
};

function shell(content: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${BRAND.text};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
${content}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function logo(): string {
  return `<tr><td style="padding:24px 0;text-align:center;">
<img src="https://dguiquantrum.com/logo.png" alt="DGI Quantrum" height="40" style="height:40px;" />
</td></tr>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.primary};color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:15px;">${label}</a>`;
}

function footer(): string {
  return `<tr><td style="padding:32px 24px 16px;text-align:center;font-size:12px;color:${BRAND.textLight};">
<p style="margin:0 0 4px">DGI Quantrum &mdash; Red de distribuidores impulsada por IA</p>
<p style="margin:0"><a href="https://dguiquantrum.com" style="color:${BRAND.primary};">dguiquantrum.com</a></p>
</td></tr>`;
}

export function welcomeEmail(distributorName: string, loginUrl: string) {
  const content = `${logo()}
<tr><td style="padding:24px;background:${BRAND.cardBg};border-radius:12px;border:1px solid ${BRAND.border};">
<h1 style="margin:0 0 16px;font-size:24px;color:${BRAND.primary};">Bienvenido a DGI Quantrum</h1>
<p style="margin:0 0 12px;font-size:16px;">Hola <strong>${distributorName}</strong>,</p>
<p style="margin:0 0 12px;font-size:15px;color:${BRAND.textLight};">Tu cuenta como distribuidor ya esta activa. Puedes acceder a tu panel de control para ver leads asignados, conversaciones en tiempo real y tu progreso.</p>
<div style="text-align:center;padding:24px 0;">${button(loginUrl, "Acceder al Panel")}</div>
<p style="margin:0;font-size:14px;color:${BRAND.textLight};">Si tenes alguna consulta, responde este email o contacta a tu administrador.</p>
</td></tr>${footer()}`;

  return shell(content, "Tu cuenta de distribuidor esta lista. Accede al panel.");
}

export function handoffEmail(
  distributorName: string,
  leadName: string,
  leadEmail: string,
  leadScore: number,
  dashboardUrl: string
) {
  const content = `${logo()}
<tr><td style="padding:24px;background:${BRAND.cardBg};border-radius:12px;border:1px solid ${BRAND.border};">
<h1 style="margin:0 0 16px;font-size:24px;color:${BRAND.primary};">Lead con alta intencion detectado</h1>
<p style="margin:0 0 12px;font-size:16px;">Hola <strong>${distributorName}</strong>,</p>
<p style="margin:0 0 12px;font-size:15px;color:${BRAND.textLight};">Un lead ha alcanzado nivel de intencion <strong>ALTA_INTENCION</strong> y requiere tu seguimiento inmediato.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:${BRAND.bg};border-radius:8px;padding:16px;">
<tr><td style="padding:4px 12px;font-size:14px;color:${BRAND.textLight};">Nombre</td><td style="padding:4px 12px;font-size:14px;font-weight:600;">${leadName}</td></tr>
<tr><td style="padding:4px 12px;font-size:14px;color:${BRAND.textLight};">Email</td><td style="padding:4px 12px;font-size:14px;font-weight:600;">${leadEmail}</td></tr>
<tr><td style="padding:4px 12px;font-size:14px;color:${BRAND.textLight};">Score</td><td style="padding:4px 12px;font-size:14px;font-weight:600;">${leadScore}/10</td></tr>
</table>
<div style="text-align:center;padding:24px 0;">${button(dashboardUrl, "Ver Lead")}</div>
</td></tr>${footer()}`;

  return shell(content, `${leadName} tiene alta intencion. Score: ${leadScore}/10.`);
}

export function followupReminderEmail(
  distributorName: string,
  leadName: string,
  dueDate: string,
  dashboardUrl: string
) {
  const content = `${logo()}
<tr><td style="padding:24px;background:${BRAND.cardBg};border-radius:12px;border:1px solid ${BRAND.border};">
<h1 style="margin:0 0 16px;font-size:24px;color:${BRAND.primary};">Recordatorio de seguimiento</h1>
<p style="margin:0 0 12px;font-size:16px;">Hola <strong>${distributorName}</strong>,</p>
<p style="margin:0 0 12px;font-size:15px;color:${BRAND.textLight};">Tenes un seguimiento pendiente para el lead <strong>${leadName}</strong> con fecha limite el <strong>${dueDate}</strong>.</p>
<p style="margin:0 0 16px;font-size:15px;color:${BRAND.textLight};">No olvides completar la accion para mantener el pipeline activo.</p>
<div style="text-align:center;padding:24px 0;">${button(dashboardUrl, "Ir al Panel")}</div>
</td></tr>${footer()}`;

  return shell(content, `Seguimiento pendiente para ${leadName}. Vence el ${dueDate}.`);
}
