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
  isSalesFamily: boolean;
  familyProductId?: string;
  availability?: DailyAvailability;
};
export type ProductionFamily = {
  product: Product;
  members: Product[];
};
export type ProductionBatch = {
  id: string;
  familyProductId: string;
  componentProductId: string;
  componentName: string;
  quantity: number;
  unitCost: number;
  note?: string;
  createdAt: string;
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
export type CashWithdrawal = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
};
export type RecentSale = {
  id: string;
  saleNumber: number;
  total: number;
  payment: PaymentMethod;
  createdAt: string;
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
    productId?: string;
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
