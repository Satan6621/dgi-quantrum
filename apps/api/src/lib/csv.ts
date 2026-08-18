/**
 * Parser CSV mínimo (sin dependencias): soporta comillas, comas y saltos de
 * línea dentro de campos, y CRLF/LF. Devuelve un arreglo de objetos con la
 * primera fila como encabezados.
 */
export function parseCsv(text: string): Array<Record<string, string>> {
  const rows = tokenizeCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
}

function tokenizeCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const s = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Normaliza un valor de teléfono a formato compacto (para dedupe). */
export function normalizePhone(p: string): string {
  return p.replace(/\s+/g, "").replace(/^\+/, "");
}

/** Normaliza un email (minúsculas, sin espacios). */
export function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}