import type { OperatingSchedule } from "./types";

export const weekdayOptions = [
  { value: 1, short: "Lun", label: "Lunes" },
  { value: 2, short: "Mar", label: "Martes" },
  { value: 3, short: "Mié", label: "Miércoles" },
  { value: 4, short: "Jue", label: "Jueves" },
  { value: 5, short: "Vie", label: "Viernes" },
  { value: 6, short: "Sáb", label: "Sábado" },
  { value: 7, short: "Dom", label: "Domingo" },
] as const;

export function countOperatingDaysInMonth(
  schedule: OperatingSchedule,
  date = new Date(),
) {
  const allowed = new Set(schedule.weekdays);
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const jsDay = new Date(year, month, day).getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (allowed.has(isoDay)) count += 1;
  }
  return count;
}
