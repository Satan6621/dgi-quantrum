import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifica la firma de Cal.com `X-Cal-Signature-256`: HMAC-SHA256 (hex) del
 * webhook secret sobre el RAW del body. Acepta el valor con o sin prefijo `sha256=`.
 */
export function verifyCalSignature(secret: string, rawBody: Buffer, signature: string): boolean {
  if (!secret || !signature || !rawBody?.length) return false;
  const provided = signature.replace(/^sha256=/, "").trim();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface CalBooking {
  inviteeEmail?: string | null;
  inviteeName?: string | null;
  start?: string | null;
  url?: string | null;
}

/**
 * Extrae la cita de un payload de Cal.com:
 * - v2: { triggerEvent: "BOOKING_CREATED", payload: { booking: {...}, attendees: [...] } }
 * - v1: { payload: { email, attendee, startTime, ... } }
 */
export function parseCalPayload(body: any): CalBooking | null {
  const p = body?.payload || body || {};
  const booking = p?.booking || {};
  const inviteeEmail =
    booking?.responses?.email?.value ||
    p?.responses?.email?.value ||
    booking?.user?.email ||
    p?.email ||
    p?.attendees?.[0]?.email ||
    body?.inviteeEmail;
  if (!inviteeEmail) return null;
  return {
    inviteeEmail: String(inviteeEmail),
    inviteeName: booking?.user?.name || p?.attendees?.[0]?.name || p?.name || null,
    start: booking?.start || p?.start || p?.startTime || null,
    url: booking?.url || p?.url || null,
  };
}