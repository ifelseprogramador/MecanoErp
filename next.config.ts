import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Evita que o Next suba a árvore de diretórios até /home/eduardo/code
  // (que tem seu próprio package-lock.json de outros projetos) ao resolver
  // a raiz do workspace.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
