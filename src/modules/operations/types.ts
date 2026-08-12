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
  ingredientName?: string;
  supplier?: string;
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
