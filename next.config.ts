import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep long-lived POS tabs aligned with the active Vercel deployment.
  // Without this identifier, a tab opened before a deploy can keep sending
  // Server Action ids that no longer exist in the new build.
  deploymentId:
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID,
};

export default nextConfig;
