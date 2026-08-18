import { safeParseJson } from "./helpers";

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/\r?\n/g, " ").replace(/"/g, '""');
    return /[",;\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  return "\uFEFF" + lines.join("\r\n"); // BOM para Excel
}

function toJson(rows: any[]) {
  return JSON.stringify(rows, null, 2);
}

export interface ExportableRow {
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

export function renderExport(data: ExportableRow, format: string, filename: string): { body: string; contentType: string; disposition: string } {
  if (format === "json") {
    const obj = data.rows.map((r) => Object.fromEntries(data.headers.map((h, i) => [h, r[i] ?? null])));
    return {
      body: toJson(obj),
      contentType: "application/json; charset=utf-8",
      disposition: `attachment; filename="${filename}.json"`,
    };
  }
  return {
    body: toCsv(data.headers, data.rows),
    contentType: "text/csv; charset=utf-8",
    disposition: `attachment; filename="${filename}.csv"`,
  };
}

export function flattenLead(l: any): (string | number | null)[] {
  return [
    l.id,
    l.name,
    l.email,
    l.phone,
    l.source,
    l.status,
    l.score,
    l.intentLevel,
    l.outcome,
    l.distributor?.name ?? null,
    l.firstSeen?.toISOString?.() ?? l.firstSeen ?? null,
    l.lastActivity?.toISOString?.() ?? l.lastActivity ?? null,
  ];
}

export function flattenBrain(b: any): (string | number | null)[] {
  return [b.id, b.category, b.title, b.content, b.keywords, b.active];
}

export function flattenDistributor(d: any): (string | number | null)[] {
  const variants = safeParseJson(d.variants, []);
  return [d.id, d.name, d.slug, d.level, d.points, d.commissionBalance, d.sponsor?.name ?? null, variants.length];
}

export function flattenCommission(c: any): (string | number | null)[] {
  return [
    c.id,
    c.distributor?.name ?? null,
    c.type,
    c.amount,
    c.description,
    c.createdAt?.toISOString?.() ?? null,
  ];
}

export function flattenFollowUp(f: any): (string | number | null)[] {
  return [
    f.id,
    f.lead?.name ?? null,
    f.lead?.phone ?? null,
    f.kind,
    f.scheduledAt?.toISOString?.() ?? null,
    f.sentAt?.toISOString?.() ?? null,
    f.status,
    f.content,
  ];
}

export function flattenSession(s: any): (string | number | null)[] {
  return [
    s.id,
    s.distributor?.name ?? null,
    s.lead?.name ?? null,
    s.channel,
    s.variant,
    s.startedAt?.toISOString?.() ?? null,
    s.endedAt?.toISOString?.() ?? null,
    s.messages.length,
  ];
}