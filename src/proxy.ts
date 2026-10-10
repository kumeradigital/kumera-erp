import type { NextRequest } from "next/server";
import { updateSession } from "@/server/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|caja-sw.js|caja/manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
