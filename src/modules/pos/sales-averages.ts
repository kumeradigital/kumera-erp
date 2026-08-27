/** Each Chilean opening date counts once, even if multiple boxes were opened. */
export function workedDays(sessions: { openedAt: string }[]) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return new Set(
    sessions.map((session) => formatter.format(new Date(session.openedAt))),
  ).size;
}

export function averagePerWorkedDay(total: number, days: number) {
  return days > 0 ? total / days : 0;
}
