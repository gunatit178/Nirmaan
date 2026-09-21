import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // The repo root has its own package-lock.json (for the static site's Tailwind
  // build). Pin Turbopack's workspace root to this directory so it doesn't try
  // to infer it from that sibling lockfile.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
