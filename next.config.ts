import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets test/CI builds target their own directory. `next build` and `next dev`
  // otherwise share `.next`, so building while a dev server is running clobbers
  // it underneath and the browser ends up holding chunks the server no longer
  // has — the page renders but never hydrates.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Pin the workspace root so Turbopack doesn't walk up and adopt a stray
  // lockfile from a parent directory.
  turbopack: { root: __dirname },
  // Emits .next/standalone with a self-contained server.js and only the
  // node_modules actually reachable at runtime — that's what the Docker image
  // ships instead of the full dependency tree.
  output: "standalone",
};

export default nextConfig;
