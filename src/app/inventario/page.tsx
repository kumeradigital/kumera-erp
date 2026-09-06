import { InventoryClient } from "@/modules/inventory/inventory-client";
import { getInventoryItems } from "@/modules/inventory/data";
import { PosShell } from "@/modules/pos/pos-shell";

export default async function InventoryPage() {
  const items = await getInventoryItems();
  return (
    <PosShell active="inventory">
      <InventoryClient items={items} />
    </PosShell>
  );
}
