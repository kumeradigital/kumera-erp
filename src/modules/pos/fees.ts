import type { PaymentMethod } from "./types";

export type CardFeeSettings = {
  model: "none" | "percentage" | "mixed";
  percentage: number;
  fixedAmount: number;
  vatRate: number;
  settlementDays: number;
};

export function calculateCardFee(
  total: number,
  payment: PaymentMethod,
  settings: CardFeeSettings,
) {
  const card = payment === "debit" || payment === "credit";
  let net = 0;
  if (card && settings.model !== "none") {
    net = Math.round(total * (settings.percentage / 100));
    if (settings.model === "mixed") net += settings.fixedAmount;
  }
  const tax = Math.round(net * (settings.vatRate / 100));
  return { net, tax, total: net + tax, deposit: total - net - tax };
}

export function effectiveCardFeePercentage(
  settings: CardFeeSettings,
  expectedTicket: number,
) {
  if (settings.model === "none" || expectedTicket <= 0) return 0;
  const fixed = settings.model === "mixed" ? settings.fixedAmount : 0;
  return settings.percentage + (fixed / expectedTicket) * 100;
}
