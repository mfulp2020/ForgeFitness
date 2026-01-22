import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next can incorrectly infer the workspace root if multiple lockfiles exist
  // elsewhere on the machine (e.g. in the home directory). Setting this keeps
  // tracing and dev output rooted to this project.
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
