import { requireModule } from "@/server/saas/access";
import { redirect } from "next/navigation";
export default async function ProductsPage() {
  await requireModule("pos");
  redirect("/costos?tab=products&view=catalog");
}
