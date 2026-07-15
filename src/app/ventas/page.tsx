import { getSalesSummary } from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { SalesDashboard } from "@/modules/pos/sales-dashboard";

type Query = {
  period?: string;
  date?: string;
  month?: string;
  from?: string;
  to?: string;
};

function chileToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function santiagoMidnightUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(guess));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const localAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return new Date(guess - (localAsUtc - guess)).toISOString();
}

function resolvePeriod(query: Query) {
  const today = chileToday();
  const requested = query.period as "today" | "day" | "month" | "range";
  const mode = (["today", "day", "month", "range"] as const).includes(requested)
    ? requested
    : "today";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date || "")
    ? query.date!
    : today;
  const month = /^\d{4}-\d{2}$/.test(query.month || "")
    ? query.month!
    : today.slice(0, 7);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from || "")
    ? query.from!
    : today;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to || "") ? query.to! : today;
  let start = today;
  let end = addDays(today, 1);
  let label = `Día en curso · ${today}`;
  if (mode === "day") {
    start = date;
    end = addDays(date, 1);
    label = `Día seleccionado · ${date}`;
  } else if (mode === "month") {
    start = `${month}-01`;
    const [year, value] = month.split("-").map(Number);
    end = new Date(Date.UTC(year, value, 1)).toISOString().slice(0, 10);
    label = `Mes seleccionado · ${month}`;
  } else if (mode === "range") {
    start = from <= to ? from : to;
    end = addDays(from <= to ? to : from, 1);
    label = `Rango seleccionado · ${start} al ${addDays(end, -1)}`;
  }
  return {
    mode,
    date,
    month,
    from,
    to,
    label,
    range: { from: santiagoMidnightUtc(start), to: santiagoMidnightUtc(end) },
  };
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const period = resolvePeriod(await searchParams);
  const data = await getSalesSummary(period.range);
  return (
    <PosShell active="sales">
      <SalesDashboard {...data} period={period} />
    </PosShell>
  );
}
