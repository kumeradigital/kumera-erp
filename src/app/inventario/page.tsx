import { InventoryClient } from "@/modules/inventory/inventory-client";
import {
  getInventoryItems,
  getInventoryProviders,
} from "@/modules/inventory/data";
import { PosShell } from "@/modules/pos/pos-shell";

export default async function InventoryPage() {
  const [items, providers] = await Promise.all([
    getInventoryItems(),
    getInventoryProviders(),
  ]);
  return (
    <PosShell active="inventory">
      <InventoryClient items={items} providers={providers} />
    </PosShell>
  );
}
