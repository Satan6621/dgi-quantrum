import nodemailer from "nodemailer";
import { env } from "../env";

let transporter: nodemailer.Transporter | null = null;
let initialized = false;

function getTransporter(): nodemailer.Transporter | null {
  if (initialized) return transporter;
  initialized = true;
  if (!env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Envía un email por SMTP si está configurado; si no, lo registra en el log (modo demo). */
export async function sendEmail(input: EmailInput): Promise<{ ok: boolean; mode: "smtp" | "log"; error?: string }> {
  const tr = getTransporter();
  if (!tr) {
    console.log(`[email:log] to=${input.to} subject="${input.subject}"\n  ${input.text.slice(0, 300)}`);
    return { ok: true, mode: "log" };
  }
  try {
    await tr.sendMail({ from: env.SMTP_FROM, to: input.to, subject: input.subject, text: input.text, html: input.html });
    return { ok: true, mode: "smtp" };
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[email] error enviando a ${input.to}: ${msg}`);
    return { ok: false, mode: "smtp", error: msg };
  }
}