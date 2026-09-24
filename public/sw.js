// Service worker do MecanoErp — só cuida de deixar a interface e as
// páginas já visitadas disponíveis offline (leitura). Gravações offline
// (criar cliente, etc.) são responsabilidade do app em JS
// (src/core/offline/), não deste worker: de propósito, ele NUNCA
// intercepta requisições que não sejam GET — uma Server Action é um POST,
// e responder por ela aqui com uma resposta fake quebraria o formato que
// o React Server Components espera de volta.
//
// Versionar o cache pelo nome: mudar CACHE_NAME invalida tudo que tinha
// sido guardado numa versão anterior deste arquivo. Precisa bater com
// `SW_CACHE_NAME` em src/core/offline/constants.ts (o app também escreve
// direto no Cache Storage, fora deste worker — ver sync-provider.tsx).
// v2 (2026-09-23): invalida páginas cacheadas de antes do tema de cor
// "oficina" (globals.css) — sem isso, quem já tinha o SW ativo
// continuaria vendo a versão preto-e-branco antiga no fallback offline
// mesmo depois do deploy novo.
const CACHE_NAME = "mecanoerp-v2";
const OFFLINE_URL = "/offline";

// Só páginas simples aqui: buscar a URL crua com `fetch()` (como este
// precache faz) só guarda o HTML/RSC da rota, não os pedaços de
// JavaScript que ela carrega (esses só entram no cache quando um
// carregamento de página DE VERDADE os pede, ou via
// `router.prefetch()`). Rotas "pendente" (client-heavy — ver
// core/offline/sync-provider.tsx) usam `router.prefetch()` em vez de
// entrar aqui, justamente por causa disso.
const APP_SHELL = ["/login", OFFLINE_URL];

// Não usa `cache.addAll` (tudo ou nada, e trataria um redirect como
// sucesso): este service worker registra em QUALQUER página, inclusive
// `/login` — se a instalação cair bem nesse momento (antes de
// autenticar), buscar uma rota protegida como `/clientes/pendente`
// redirecionaria PRA `/login`, e cacharia o HTML da tela de login sob a
// chave errada. `redirect: "manual"` faz o fetch NÃO seguir o redirect
// (a resposta vira um "opaqueredirect", identificável), então dá pra
// pular essa URL específica sem derrubar as outras nem guardar
// conteúdo errado.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const response = await fetch(url, { redirect: "manual" });
            if (response.type === "opaqueredirect" || !response.ok) return;
            await cache.put(url, response);
          } catch {
            // Sem rede na instalação (raro, mas possível) — segue sem
            // essa URL no precache; a navegação normal ainda cacheia
            // organicamente depois, se conseguir.
          }
        }),
      );
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Só GET: POST (Server Actions, login, logout) sempre vai direto pra
  // rede — sem cache, sem fallback aqui. O app trata a falha de rede do
  // lado do cliente (ver core/offline/use-offline-create-action.ts).
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação de página inteira (o usuário abrindo/recarregando uma
  // rota): tenta a rede primeiro (dado mais fresco possível), cai pro
  // cache da última visita se estiver offline, e por último numa página
  // de aviso genérica se nunca visitou aquela rota.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          // `ignoreSearch`: rotas "pendente" (ver comentário em
          // APP_SHELL) usam `?id=...` — o cache guarda o caminho SEM
          // query, então precisa ignorar a query pra bater com
          // qualquer id.
          const cached = await caches.match(request, { ignoreSearch: true });
          return cached ?? (await caches.match(OFFLINE_URL));
        }),
    );
    return;
  }

  // Assets estáticos do Next (/_next/static/...) são versionados pelo
  // nome do arquivo (conteúdo com hash) — nunca mudam de conteúdo pra uma
  // mesma URL, então cache-first é seguro e evita ida à rede à toa.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Demais GET (RSC payloads de prefetch, API de health, etc.):
  // network-first com fallback pro cache, mesma lógica da navegação, sem
  // fallback de página offline (não faz sentido pra esses).
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
