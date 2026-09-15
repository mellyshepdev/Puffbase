import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.99.131.20", "localhost", "127.0.0.1"],
  // Turbopack externalizes `pg` under a hashed module name that does not
  // resolve at runtime - force it to stay a plain require.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
