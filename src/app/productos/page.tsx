import { getArchivedProducts, getProducts } from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { ProductsClient } from "@/modules/pos/products-client";
import { requireModule } from "@/server/saas/access";
export default async function ProductsPage() {
  await requireModule("pos");
  const [products, archivedProducts] = await Promise.all([
    getProducts(true),
    getArchivedProducts(),
  ]);
  return (
    <PosShell active="products">
      <ProductsClient products={products} archivedProducts={archivedProducts} />
    </PosShell>
  );
}
