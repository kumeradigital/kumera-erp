export type PaymentMethod = "cash" | "debit" | "credit" | "transfer";
export type SaleUnit = "unit" | "kg";
export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  saleUnit: SaleUnit;
  category: string;
  imageUrl?: string;
  active: boolean;
};
export type CashSession = {
  id: string;
  status: "open" | "closed";
  openingCash: number;
  countedCash?: number;
  openedAt: string;
  closedAt?: string;
  autoClosed?: boolean;
};
export type SaleSummary = {
  total: number;
  count: number;
  average: number;
  byPayment: { method: PaymentMethod; total: number }[];
  topProducts: { name: string; quantity: number; saleUnit: SaleUnit }[];
};
export const paymentLabels: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
};
