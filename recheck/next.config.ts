import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      // Only the global stylesheet holds Tailwind directives. A "*.css" glob
      // would also catch *.module.css and turn CSS modules into global CSS.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
