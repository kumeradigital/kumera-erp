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
  trackDailyAvailability: boolean;
  availability?: DailyAvailability;
};
export type AvailabilityMovementType =
  "production" | "waste" | "consumption" | "correction";
export type DailyAvailability = {
  productId: string;
  productName: string;
  openingQuantity: number;
  availableQuantity: number;
  producedQuantity: number;
  soldQuantity: number;
  adjustedQuantity: number;
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
export type SalesSessionPeriod = {
  id: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  autoClosed: boolean;
};
export type SaleSummary = {
  total: number;
  recordedTotal: number;
  unallocatedDifference: number;
  commissionNet: number;
  commissionTax: number;
  commissionTotal: number;
  netReceivable: number;
  count: number;
  average: number;
  hourlySales: {
    hour: number;
    total: number;
    count: number;
    average: number;
  }[];
  byPayment: { method: PaymentMethod; total: number }[];
  topProducts: {
    name: string;
    quantity: number;
    saleUnit: SaleUnit;
    total: number;
  }[];
};

export type SessionClosingSummary = {
  byPayment: Record<PaymentMethod, number>;
  transactionsByPayment: Record<PaymentMethod, number>;
  products: {
    name: string;
    quantity: number;
    saleUnit: SaleUnit;
    total: number;
  }[];
};
export const paymentLabels: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
};
