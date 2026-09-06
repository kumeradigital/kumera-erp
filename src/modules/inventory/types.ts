export const inventorySuppliers = [
  "Vanni",
  "Mayorista Central",
  "Distribuidora Ja",
  "Marcelo",
  "La Oferta",
] as const;

export type InventorySupplier = (typeof inventorySuppliers)[number];

export type InventoryItem = {
  id: string;
  kind: "ingredient" | "supply";
  name: string;
  category: string;
  quantity?: number;
  supplier?: InventorySupplier;
  updatedAt?: string;
};
