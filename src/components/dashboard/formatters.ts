/**
 * Reine Formatierungs- und ID-Helfer des Dashboards (ohne React-Bezug).
 */
import { getISOWeek } from "@/lib/time-period";

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const dateStr = d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
  const kw = getISOWeek(d);
  return `${dateStr} · KW ${kw}`;
}

export function fmtEuro(v: number) {
  return v.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(s?: string): boolean {
  if (!s || !ISO_DATE_RE.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}
