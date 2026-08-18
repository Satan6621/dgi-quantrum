import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifica la firma `X-Twilio-Signature`: HMAC-SHA1 (base64) del auth token
 * sobre `url` + pares clave/valor del body ordenados alfabéticamente.
 */
export function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, any>,
  signature: string
): boolean {
  if (!authToken || !signature) return false;
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k] === undefined ? "" : String(params[k])}`)
    .join("");
  const expected = createHmac("sha1", authToken).update(url + canonical).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verifica la firma de Meta `X-Hub-Signature-256`: HMAC-SHA256 (hex) del app
 * secret sobre el RAW del body (byte a byte).
 */
export function verifyMetaSignature(appSecret: string, rawBody: Buffer, signature: string): boolean {
  if (!appSecret || !signature || !rawBody?.length) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signature.replace(/^sha256=/, "").trim();
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface WsMessage {
  from: string;
  text: string;
  sid?: string;
}

/** Payload entrante de Twilio (form/x-www-form-urlencoded o JSON). */
export function parseTwilioPayload(body: any): WsMessage | null {
  const from = body?.From || body?.from;
  const text = body?.Body ?? body?.body;
  if (!from || text === undefined) return null;
  return {
    from: String(from),
    text: String(text),
    sid: body?.MessageSid || body?.SmsMessageSid || undefined,
  };
}

/** Payload entrante de WhatsApp Cloud API de Meta (entrada webhook v19+). */
export function parseMetaPayload(body: any): WsMessage | null {
  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return null;
  const from = msg?.from;
  const text =
    msg?.type === "text" ? msg?.text?.body : msg?.type === "interactive" ? msg?.interactive?.body?.text || msg?.button?.text : undefined;
  if (!from || text === undefined) return null;
  return { from: String(from), text: String(text), sid: msg?.id };
}
