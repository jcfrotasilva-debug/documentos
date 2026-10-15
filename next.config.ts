import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* pg é CommonJS e tenta requerer 'pg-native' opcionalmente: mantê-lo externo
     ao bundle evita falhas de build/runtime em ambientes serverless (Vercel). */
  serverExternalPackages: ["pg"],
};

export default nextConfig;
