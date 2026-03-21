import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  outputFileTracingExcludes: {
    "*": [
      "./public/temas/**/*.wav",
      "./public/temas/**/*.png",
      "./src/temas/**/*",
    ],
  },
};

export default nextConfig;
