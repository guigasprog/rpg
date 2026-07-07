import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace neste projeto (há um package-lock.json no
  // diretório-pai do usuário que confundia a inferência do Turbopack).
  turbopack: {
    root: projectRoot,
  },
  // Garante que o engine do Prisma (client gerado em src/generated/prisma)
  // seja empacotado nas funções serverless da Vercel.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*"],
  },
  // Libera o acesso ao servidor de DEV a partir de outros dispositivos
  // (o Next 16 bloqueia recursos de dev cross-origin por padrão).
  allowedDevOrigins: [
    "192.168.*.*", // LAN doméstica
    "10.*.*.*", // LAN corporativa/VPN
    "172.*.*.*", // LAN / WSL / Docker
    "100.*.*.*", // Tailscale
  ],
  experimental: {
    // Libera a checagem anti-CSRF das Server Actions para acesso a partir de
    // outros dispositivos (LAN + Tailscale). Cobre as faixas de IP privadas
    // comuns — assim login/salvar funcionam do celular dos jogadores.
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "192.168.*.*", // LAN doméstica
        "10.*.*.*", // LAN corporativa/VPN
        "172.*.*.*", // LAN / WSL / Docker
        "100.*.*.*", // Tailscale
      ],
    },
  },
};

export default nextConfig;
