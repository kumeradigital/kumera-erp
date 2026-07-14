export type TaxMode = "included" | "added" | "exempt";
export function formatClp(value: number) { return new Intl.NumberFormat("es-CL", { style:"currency", currency:"CLP", maximumFractionDigits:0 }).format(value).replace("CLP", "$ "); }
export function calculateTax(amount: number, mode: TaxMode, rate = 19) {
  const clean = Math.max(0, Math.round(amount || 0));
  if (mode === "exempt") return { net:clean, tax:0, total:clean };
  if (mode === "added") { const tax=Math.round(clean*(rate/100)); return { net:clean, tax, total:clean+tax }; }
  const net=Math.round(clean/(1+rate/100)); return { net, tax:clean-net, total:clean };
}
