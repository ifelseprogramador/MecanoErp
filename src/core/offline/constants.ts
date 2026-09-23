/**
 * Precisa bater com `CACHE_NAME` em `public/sw.js` — não dá pra
 * importar de lá pra cá (é um script cru, fora do bundle do Next), então
 * os dois valores são mantidos manualmente em sincronia. Usado quando o
 * app (não o service worker) escreve direto no Cache Storage — ver
 * `sync-provider.tsx`.
 */
export const SW_CACHE_NAME = "mecanoerp-v1";
