# Arquitetura

Visão de como o projeto é organizado e as regras que mantêm a promessa de
"adicionar/remover funcionalidade rapidamente". Para o porquê de cada
decisão, ver `docs/decisoes.md`. Para o plano original completo (contexto,
fases, modelo de dados), ver
`/home/eduardo/.claude/plans/quero-fazer-um-erp-modular-teacup.md`.

## Estrutura de pastas

```
src/
  app/
    (auth)/login/            # rotas públicas
    (app)/                   # rotas protegidas (proxy.ts exige sessão)
      clientes/, veiculos/, catalogo/, ordens/  # rotas finas: só compõem modules/
    (admin)/admin/           # painel do dono da plataforma — ver seção própria
    api/health/
  modules/
    <modulo>/
      module.ts        # metadados: slug, label, ícone, rota, ordem, enabled
      schema.ts         # tabelas Drizzle do módulo
      schema.types.ts    # tipos inferidos do schema (InferSelectModel)
      validation.ts      # schemas Zod — form e Server Action compartilham
      queries.ts          # leituras, sempre via core/auth#withOrg()
      actions.ts           # Server Actions (create/update/delete)
      index.ts              # API pública do módulo (o único ponto que
                             # outro módulo pode importar)
      components/            # form, tabela, etc.
      __tests__/               # testes do módulo
  core/
    db.ts, auth.ts, admin-auth.ts, platform-admin.ts, logger.ts,
    registry.ts, module-settings.ts, load-modules.ts, impersonation.ts,
    action-result.ts, money.ts, format.ts, document.ts, env.ts
    admin/        # backend do painel do dono — não é um "módulo" plugável
      queries.ts, actions.ts, validation.ts, audit.ts, components/
    live-support/  # suporte ao vivo (co-browsing) — usado por (app) e /admin
      queries.ts, actions.ts, realtime.ts, control-events.ts,
      apply-control-event.ts, components/
  components/
    ui/            # shadcn/ui (gerado, não editar à mão como se fosse seu —
                   # exceção documentada: card.tsx/table.tsx tiveram um ajuste
                   # mínimo de cor pra herdar o tema "oficina", ver
                   # docs/decisoes.md 2026-09-23 "Ajustes de feedback")
    search-box.tsx, confirm-delete-button.tsx  # genéricos entre módulos
db/
  schema.ts               # reexporta o schema.ts de cada módulo
  schema/tenancy.ts         # organizations + memberships + platform_admins +
                             # organization_module_settings (fundação, não módulo)
  schema/live-support.ts     # audit_log + live_sessions
  migrations/                # geradas por `npm run db:generate`
  migrations-custom/          # RLS, funções SQL, FKs para auth.users
  migrate.ts, seed.ts
```

## Regra de acoplamento entre módulos

Um módulo pode importar de `core/` e `components/ui/`. **Nunca** de outro
módulo diretamente — só do `index.ts` (barrel) dele. Exemplo real: o form
de veículo precisa de uma lista de clientes para o seletor; em vez de
`veiculos` importar `modules/clientes/queries.ts`, ele importa
`listCustomersForSelect` de `@/modules/clientes` (o barrel).

Uma **página** em `app/` pode compor múltiplos módulos — só o código
_dentro_ de `modules/` não pode. Exemplo: `app/(app)/clientes/[id]/page.tsx`
lê tanto `modules/clientes` quanto `modules/veiculos` para mostrar os
veículos do cliente na mesma tela.

`module.ts` declara `dependsOn` (documental) para avisar quando um módulo
depende de outro — útil na hora de decidir se dá para desligar um módulo
sem quebrar outro.

## Registrar/remover um módulo

O menu lateral nunca tem link hardcoded — ele lê `core/registry.ts`
(`getEnabledModules()`), que só é populado pelos módulos que
`core/load-modules.ts` importa (efeito colateral de `registerModule(...)`
em cada `module.ts`).

- **Adicionar**: criar a pasta do módulo + uma linha de import em
  `core/load-modules.ts` + reexport em `db/schema.ts` se o módulo tiver
  tabela.
- **Remover**: apagar a pasta, tirar a linha de `load-modules.ts` e de
  `db/schema.ts`. O menu some sozinho.

## Multi-tenant / RLS

Toda tabela de negócio tem `organization_id` e RLS habilitada. O padrão
(policies de select/insert/update/delete restritas à organização do
usuário logado) é aplicado pelo helper SQL `apply_org_rls(table_name)`
definido em `db/migrations-custom/0001_rls_policies.sql` — toda migration
de RLS de um módulo novo é só `select public.apply_org_rls('nome_tabela');`.
Ver a decisão de por que isso fica fora do schema do Drizzle em
`docs/decisoes.md`.

No código da aplicação, `core/auth.ts#withOrg()` é o ponto de entrada
padrão de toda Server Action e query — devolve `db`, `organizationId` e um
`logger` já contextualizado (`requestId`/`userId`/`organizationId`). Nenhum
módulo deve montar esse contexto na mão nem filtrar por organização "à
mão" fora desse helper.

## Área do dono da plataforma (`/admin`)

Separada dos módulos de negócio (não é uma "funcionalidade da oficina",
é a operação da plataforma em si — você, não o mecânico). Vive em
`app/(admin)/admin/` + `core/admin/` + `core/admin-auth.ts`.

- **Quem entra**: só usuários cadastrados em `platform_admins` (tabela
  separada de `memberships` — ser dono de uma oficina não dá acesso aqui,
  e vice-versa). Todo ponto de entrada passa por
  `core/admin-auth.ts#requireAdmin()`, o equivalente ao `withOrg()` dos
  módulos comuns, mas **sem** filtro de organização — ver
  "Por que não precisa de outra chave" logo abaixo.
- **Por que não precisa de outra chave/service role**: a conexão do banco
  do app inteiro (`core/db.ts`, via `DATABASE_URL`) já ignora RLS
  (`bypassrls = true` no papel `postgres` do Supabase — ver
  `docs/decisoes.md`, 2026-09-22). Então `core/admin/` usa a mesma `db`
  sem nenhum `where organization_id = ...`, e a única proteção real é a
  checagem de `requireAdmin()` ter rodado antes. **Nunca** exporte uma
  query/action de `core/admin/` sem passar por `requireAdmin()` primeiro.
- **O que dá pra fazer hoje**: criar oficina + usuário dono (via Admin API
  do Supabase, `core/supabase/admin.ts` — a única peça que usa a
  `SUPABASE_SERVICE_ROLE_KEY` fora do seed), bloquear/desbloquear o
  acesso de uma oficina inteira, editar status de cobrança/vencimento/
  observações (controle manual, sem gateway de pagamento — ver
  `docs/decisoes.md`), ligar/desligar um módulo especificamente para uma
  oficina (personalização — `organization_module_settings`, lido por
  `core/module-settings.ts#getEnabledModulesForOrg`), e apagar uma
  oficina e todos os dados dela (com confirmação por nome digitado).
- **Bloqueio de acesso**: `organizations.status = 'blocked'` é checado
  dentro de `core/auth.ts#getActiveOrg()` — lança `OrganizationBlockedError`,
  tratado em `(app)/layout.tsx` com uma tela de "acesso bloqueado". Existe
  também `memberships.active` para bloquear uma pessoa específica dentro
  de uma oficina (sem UI própria ainda).
- **Modo suporte (impersonation)**: botão "Entrar como suporte" na ficha
  da oficina (`core/admin/components/impersonate-button.tsx`) reaproveita
  as telas normais do app em vez de duplicar UI — o admin passa a
  acessar `/` como se fosse o dono daquela oficina (`role: "owner"`,
  mesmo acesso de leitura/edição/criação que ela teria), com uma faixa
  laranja fixa lembrando "Modo suporte: agindo como X" e um botão para
  sair a qualquer momento. Funciona mesmo com a oficina bloqueada (é
  quando mais se precisa de suporte). Implementado com um cookie httpOnly
  guardando só o id da organização, sem sessão Supabase falsa — ver
  `docs/decisoes.md` (2026-09-22, "Modo suporte") para o desenho
  completo e por que essa opção foi escolhida.
- **Auditoria**: `audit_log` (`core/admin/audit.ts#recordAudit`) registra
  toda ação de admin (bloquear, cobrança, módulo, criar/apagar oficina,
  modo suporte, sessões de suporte ao vivo) — sempre com o `actorUserId`
  do admin de verdade, nunca troca de identidade. Visível na ficha de
  cada oficina ("Histórico"). Toda action nova de `core/admin/` deve
  chamar `recordAudit(...)` depois de uma mutação com sucesso.

## Suporte ao vivo (co-browsing + controle remoto)

`core/live-support/` — o admin vê a tela do app do usuário em tempo real
e, se autorizado, controla o mouse/teclado remotamente. Pedido explícito
do usuário ("acesso remoto, ver o mouse mexendo, os dois em tempo real").

- **Como funciona**: `rrweb` grava o DOM da página do usuário
  (`live-support-widget.tsx`, montado em `(app)/layout.tsx`) e transmite
  via Supabase Realtime Broadcast; o admin reconstrói ao vivo com
  `Replayer` (`core/admin/components/live-support-card.tsx` +
  `live-support/components/live-session-viewer.tsx`). Nunca é vídeo —
  só o que está dentro do MecanoErp, nunca a tela inteira do computador.
- **`live_sessions`**: estado único (`pending -> active -> ended`/
  `declined`) para os dois fluxos de consentimento — admin pede
  (`requestSupportAccess`) ou a oficina chama (`callForSupport`, botão
  flutuante). A gravação só começa quando vira `active`, do lado de quem
  está sendo observado.
- **Controle remoto**: sempre uma concessão à parte
  (`live_sessions.controlGranted`), nunca junto do "ver a tela". O admin
  nunca controla sem essa concessão explícita.
- **Transporte por Broadcast, não Postgres Changes**: evita precisar de
  RLS de verdade (a conexão do app ignora RLS — ver docs/decisoes.md,
  "bypassrls"). O nome de cada canal usa o id da sessão (UUID) como
  segredo — mesmo modelo de um link de videochamada. A ação sempre
  reconfirma no banco antes de qualquer efeito; o Broadcast só avisa
  "releia".
- **Antes de mexer aqui**, ler docs/decisoes.md (2026-09-22, "Suporte ao
  vivo") — tem uma lista de armadilhas reais já resolvidas (iframe
  roubando clique/foco, coordenadas erradas, canal recriado perdendo
  mensagem) que vão se repetir em qualquer ajuste nessa área.

## Offline-first (PWA + fila local)

`src/core/offline/` — service worker (`public/sw.js`, só cache de
leitura de páginas já visitadas) + fila de ações pendentes em
IndexedDB (`db.ts`/`queue.ts`) para criações feitas sem conexão,
sincronizadas sozinhas quando a rede volta (`sync-engine.ts`,
`sync-provider.tsx`). `modules/clientes` é o template (form via
`use-offline-create-action.ts`, ficha "pendente" em
`(app)/clientes/pendente/page.tsx`); `veiculos`, `catalogo` e `ordens`
já seguem o mesmo padrão — os 4 módulos com formulário de criação têm
suporte offline. `ordens` só cobre o CABEÇALHO (itens exigem a OS já
sincronizada) e nunca mostra/calcula o número sequencial enquanto
pendente (só é atribuído no INSERT de verdade, no momento da
sincronização — ver docs/decisoes.md pra não reabrir essa dúvida).
Editar e apagar continuam exigindo conexão em todos os módulos, de
propósito (ver `core/offline/db.ts`). A tarja de
status (sem conexão / sincronizando / sincronizado) é do
`SyncProvider`, global — aparece em qualquer página, não só nas que
têm suporte a criação offline. **Antes de mexer aqui**, ler
docs/decisoes.md (2026-09-23, "Offline-first") — tem várias armadilhas
específicas de Next.js 16 + service worker já resolvidas (prefetch não
é suficiente pra evitar `ChunkLoadError`, `useSearchParams` exige
`Suspense` que atrapalha o prefetch, rota "pendente" precisa ser
estática, etc.) que se repetem em qualquer módulo novo que ganhar esse
suporte.

## Backup (`core/backup.ts`)

`(app)/backup/page.tsx` — qualquer dono de oficina pode baixar (ou
restaurar) um backup completo dos dados DA PRÓPRIA organização
(clientes, veículos, catálogo, ordens de serviço e itens; nunca
`organizations`/`memberships`, que são da conta, não da oficina).
`(admin)/admin/backup/route.ts` — só o dono da plataforma, backup de
TODAS as organizações de uma vez (`buildSystemBackup()`), só exporta
(sem restauração de sistema inteiro — ver docs/decisoes.md).

- `buildOrgBackup()`/`restoreOrgBackup()` em `core/backup.ts` fazem o
  trabalho de verdade; `core/backup-actions.ts` é a Server Action
  (`"use server"`) que a página chama — mesma separação de
  responsabilidade de `core/live-support/` (queries/actions em
  `core/`, não dentro de um módulo, porque não pertence a um só).
- Restaurar sempre sobrescreve `organizationId` de cada linha pelo da
  sessão de quem chama, nunca pelo que vier no arquivo, e usa
  `onConflictDoNothing()` — idempotente, seguro rodar mais de uma vez.
- Formato do arquivo: JSON com estrutura (colunas + tipos, lidos do
  schema Drizzle via `getTableColumns()`) e dados de cada tabela — ver
  docs/decisoes.md (2026-09-23, "Fase 5") pro porquê desse formato em
  vez de um dump SQL específico de dialeto.
- `components/backup-download-button.tsx` usa a Web Share API quando
  disponível (celular: abre o seletor nativo do SO — Drive, WhatsApp,
  Arquivos, etc.), cai pra download comum quando não — decisão
  explícita do usuário pra cobrir "nuvem/máquina/compartilhar" sem
  integrar um provedor específico. Se `navigator.share()` falhar por
  qualquer motivo (comum: o `await fetch()` antes consome a "ativação
  transitória" que o clique deu), cai pro download em vez de mostrar
  erro — só a falha do `fetch()` em si é um erro de verdade.
- **Backup automático diário**: `db/schema/backup.ts`
  (`organization_backup_settings` — sem linha = ligado;
  `organization_backups` — snapshots em `jsonb`, podados pros últimos
  `AUTO_BACKUP_RETENTION` por organização) + `GET /api/cron/backup`
  (Vercel Cron, `vercel.json`, protegido por `CRON_SECRET`). Ver
  docs/decisoes.md (2026-09-23) pro desenho completo.

## Notificações (`core/notifications/`)

Avisos que o dono da plataforma manda — não é um módulo plugável de
negócio, mesma categoria de `core/admin/`/`core/live-support/`.
`db/schema/notifications.ts`: `notifications` (`organization_id` nulo =
pra todas as oficinas) + `notification_reads` (quem leu, por PESSOA —
`user_id`, não só por oficina). Admin gerencia em `/admin/notificacoes`
(`core/notifications/admin-actions.ts`, atrás de `requireAdmin()`);
usuário vê no sino do cabeçalho
(`core/notifications/components/notification-bell.tsx`, montado em
`(app)/layout.tsx`) e marca como lida com `core/notifications/actions.ts#markNotificationRead`
(atrás de `withOrg()`). RLS própria (não `apply_org_rls()`) porque a
policy padrão bloquearia `organization_id` nulo. Ver docs/decisoes.md
(2026-09-23) pro desenho completo.

## Hints contextuais (`components/hint.tsx`)

Ícone de dúvida com tooltip (shadcn `components/ui/tooltip.tsx` +
`TooltipProvider` no layout raiz) ao lado de um `<Label>`, só onde o
formato ou comportamento de um campo/ação não é óbvio (formato de
CPF/CNPJ, placa, o que "desconto" faz no cálculo, o que "pendente"
significa numa lista offline). `type="button"` sempre — a maioria fica
dentro de um `<form>`. Não usar em todo lugar: um label já claro não
precisa de hint.

## Convenções de módulo (o que copiar do template)

`modules/clientes/` é o template — `modules/veiculos/` é a segunda
aplicação do mesmo padrão. Ao criar um módulo novo, copiar essa estrutura:

1. `schema.ts` com `organizationId` + índice nele, RLS via
   `apply_org_rls` numa migration custom.
2. `schema.types.ts` com o tipo inferido (nunca redigitar campos à mão).
3. `validation.ts` com um schema Zod único usado tanto pelo form quanto
   pela Server Action.
4. `actions.ts` retornando sempre `ActionResult` (`@/core/action-result`):
   `{ ok, errors?, message? }`, nunca um `throw` que o form precise
   adivinhar como exibir. Log de entrada (`log.info`) e de erro
   (`log.error`) em cada action. Ação de **criar**: `redirect()` para
   `/<modulo>/{id}?criado=1` (não só `/{id}` — o `?criado=1` liga o
   banner de "salvo, cadastrar outro", ver item 10) após salvar (sempre
   fora do `try/catch`). Ação de **editar**: retorna `{ok:true}` e
   deixa o form mostrar um toast (ver
   `customer-form.tsx`/`vehicle-form.tsx`).
5. Reaproveitar `components/search-box.tsx`,
   `components/confirm-delete-button.tsx` (botão "Remover" da página de
   DETALHE) e `components/row-actions.tsx` (par de ícones editar/apagar
   discretos numa célula de tabela — usado nas listas) em vez de
   duplicar. Passar a Server Action com `.bind(null, id)`, nunca uma
   arrow function nova — ver `docs/decisoes.md` (2026-09-22).
6. Todo `Select` do formulário precisa da prop `items` (mapa valor →
   label) no componente raiz — sem ela o Base UI mostra o valor bruto em
   vez do texto legível. Ver `docs/decisoes.md` (2026-09-22).
7. Se o módulo aparece no menu (`module.ts`), o `iconName` é uma string
   (nome do ícone do lucide-react), nunca o componente — ver
   `core/resolve-icon.tsx` e `docs/decisoes.md` (2026-09-22).
8. Dar `key={registro?.updatedAt?.toString()}` no `<form>` de criar/editar
   para os campos não controlados (Select) remontarem com dado fresco
   depois de salvar.
9. Testes de `validation.ts` sempre; testes de lógica de negócio pura
   (cálculos, máquinas de estado) sempre.
10. Página `[id]/imprimir/page.tsx`: Server Component simples, com
    `<AutoPrint />` (`components/auto-print.tsx`) logo no topo — abre o
    diálogo de impressão do navegador sozinho ao carregar, em vez de
    esperar a pessoa apertar Ctrl+P. Botão "Imprimir" na página de
    detalhe abre essa rota numa aba nova (`target="_blank"`). Ver
    `(app)/ordens/[id]/imprimir/page.tsx` como referência de layout
    (cabeçalho com nome da oficina, `print:` do Tailwind já cuida de
    esconder sidebar/topo).
11. Página de detalhe lê `searchParams` e mostra
    `components/created-banner.tsx` quando `criado === "1"` (ver item 4) — link "Cadastrar outro" apontando de volta pro formulário de
    criar do mesmo módulo.
12. Página de LISTAGEM: `<PageIcon icon={...} />` (mesmo ícone de
    `module.ts#iconName`) ao lado do `<h1>`, `<SearchBox>`
    (`components/search-box.tsx`) + `<ListFilterBar>`
    (`components/list-filter-bar.tsx`) lado a lado, acima da tabela.
    Página de CRIAR/EDITAR: `<BackButton />` (`components/back-button.tsx`,
    `router.back()`) ao lado do `<h1>`. `queries.ts` da listagem principal aceita
    `{search?, <filtro por coluna>?, sort?}` (nunca só `search?:
string`) — `sort` é uma chave de um objeto `<MODULO>_SORT_OPTIONS`
    exportado da própria `queries.ts`, resolvida pra uma expressão
    Drizzle real num mapa interno (nunca `orderBy` montado com string
    vinda de query param). Ver `docs/decisoes.md` (2026-09-23, "Fase
    2") pro desenho completo.
13. Se o módulo tem algo relevante pro painel (`(app)/page.tsx`),
    expor `get<Modulo>DashboardSummary()` em `queries.ts`, reexportada
    pelo barrel — o painel só compõe resumos de módulos existentes,
    nunca faz query direta numa tabela de outro módulo. Ver
    `docs/decisoes.md` (2026-09-23, "Fase 3").
14. Importar/exportar CSV (opcional — só faz sentido pra entidades
    cadastrais simples, não pra algo com itens/relações como `ordens`):
    `<modulo>/exportar/route.ts` (GET, `Content-Disposition:
attachment`, CSV com as MESMAS colunas que a importação aceita) +
    `<modulo>/importar/page.tsx` com `components/csv-import-form.tsx` +
    uma action `import<Entidade>Csv` em `actions.ts` usando
    `core/csv-import.ts#importCsvRows` (valida cada linha com o mesmo
    schema Zod do form, insere via `create<Entidade>Record`). Botões na
    listagem: `components/import-export-buttons.tsx`. Ver
    `docs/decisoes.md` (2026-09-23, "Fase 4").
