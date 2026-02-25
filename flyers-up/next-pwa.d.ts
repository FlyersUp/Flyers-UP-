declare module "next-pwa" {
  import type { NextConfig } from "next";
  type PWAOptions = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    buildExcludes?: RegExp[];
  };
  type WithPWA = (nextConfig: NextConfig) => NextConfig;
  function withPWAInit(options?: PWAOptions): WithPWA;
  export default withPWAInit;
}
