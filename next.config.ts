import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reuse a recently visited dynamic page in the browser instead of asking
    // Supabase for the same data again on every quick tab switch. Server
    // Actions that mutate data already revalidate their affected routes.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  // Keep long-lived POS tabs aligned with the active Vercel deployment.
  // Without this identifier, a tab opened before a deploy can keep sending
  // Server Action ids that no longer exist in the new build.
  deploymentId: (
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID
  )?.slice(0, 32),
};

export default nextConfig;
