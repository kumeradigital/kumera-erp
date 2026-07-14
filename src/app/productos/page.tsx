import { getProducts } from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { ProductsClient } from "@/modules/pos/products-client";
export default async function ProductsPage() {
  const products = await getProducts(true);
  return (
    <PosShell active="products">
      <ProductsClient products={products} />
    </PosShell>
  );
}
