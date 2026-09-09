export type OperationType =
  | "purchase"
  | "fixed_cost"
  | "expense"
  | "other_income"
  | "owner_contribution"
  | "owner_withdrawal";
export type Operation = {
  id: string;
  date: string;
  type: OperationType;
  description: string;
  category: string;
  gross: number;
  net: number;
  tax: number;
  taxRate: number;
  paymentMethod?: "cash" | "debit" | "credit" | "transfer";
  ingredientId?: string;
  ingredientName?: string;
  purchaseQuantity?: number;
  purchaseUnit?: "kg" | "g" | "l" | "ml" | "unit";
  supplier?: string;
  note?: string;
  financialStatus:
    "pending" | "verified" | "historical" | "historical_verified";
};

export type FinancialCutoff = {
  cutoffAt: string;
  cutoffDate: string;
  openingBank: number;
  openingCash: number;
  pendingReceivables: number;
  note?: string;
};

export type FinancialObligation = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  kind: "payable" | "loan_payment";
  recurrence?: "monthly";
  note?: string;
};
export const operationLabels: Record<OperationType, string> = {
  purchase: "Compra de insumos",
  fixed_cost: "Pago de costo fijo",
  expense: "Otro gasto",
  other_income: "Otro ingreso",
  owner_contribution: "Aporte del propietario",
  owner_withdrawal: "Retiro del propietario",
};
