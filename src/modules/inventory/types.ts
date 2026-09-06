export type InventoryUnit = "g" | "kg" | "ml" | "l" | "unit";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  baseUnit: "g" | "ml" | "unit";
  quantity?: number;
  unit: InventoryUnit;
  updatedAt?: string;
};
