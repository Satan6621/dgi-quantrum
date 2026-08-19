export interface ICSEvent {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  url?: string;
}

function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function generateICS(event: ICSEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DGI Quantrum//Handoff Meeting//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${formatICSDate(event.startTime)}`,
    `DTEND:${formatICSDate(event.endTime)}`,
    `SUMMARY:${event.title.replace(/[,;\\]/g, "\\$&")}`,
    `DESCRIPTION:${event.description.replace(/[,;\\]/g, "\\$&")}${event.url ? `\\n\\nEnlace: ${event.url}` : ""}`,
    `UID:${Date.now()}-dgi-quantrum@quantrum.local`,
    `DTSTAMP:${formatICSDate(new Date())}`,
  ];

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
