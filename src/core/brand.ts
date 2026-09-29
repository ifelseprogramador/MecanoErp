/**
 * Configuração de marca do sistema — usada nos pontos de UI
 * compartilhados (sidebar, header, favicon, imagem de compartilhamento,
 * tela de login). Mesmo padrão já usado no BaseERP/Prisma
 * (`base-erp/src/core/brand.ts`) — o mecano-erp ainda não faz parte da
 * automação de sincronização entre eles (arquitetura de RLS diferente,
 * ver docs/decisoes.md), mas usar a mesma peça deixa uma eventual
 * entrada na automação mais simples no futuro.
 *
 * Nunca edite `iconPaths` copiando de qualquer ícone lucide-react
 * (`node_modules/lucide-react/dist/esm/icons/<nome>.mjs`, campo `node`)
 * — os `d` de cada `<path>`, em ordem, viewBox 24x24.
 */
export interface BrandConfig {
  name: string;
  tagline: string;
  /** Cor primária em hex — mesma cor de `--primary` em `globals.css`
   * (modo claro), mas fixa: `next/og` (favicon, imagem de
   * compartilhamento) não lê variável CSS nem sabe resolver OKLCH. */
  primaryHex: string;
  /** `d` de cada `<path>` do ícone, viewBox 24x24 (mesmo formato do
   * lucide-react) — usado tanto no ícone renderizado normalmente
   * (`components/brand-icon.tsx`) quanto nas imagens geradas
   * (`app/icon.tsx`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`),
   * que não conseguem renderizar um componente React qualquer, só um
   * subconjunto de SVG/HTML puro.
   */
  iconPaths: string[];
  /** Link do aviso de privacidade mostrado na tela de login — o
   * mecano-erp não tem módulo de LGPD/privacidade ainda, fica
   * `undefined` (o link some sozinho, ver `app/(auth)/login/page.tsx`). */
  privacyPolicyHref?: string;
}

export const BRAND: BrandConfig = {
  name: "MecanoErp",
  tagline: "Gestão completa para a sua oficina.",
  primaryHex: "#f54900",
  // lucide-react "wrench"
  iconPaths: [
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",
  ],
};
