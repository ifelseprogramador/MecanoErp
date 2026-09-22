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
      clientes/, veiculos/   # rotas finas: só compõem o que vem de modules/
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
    ui/            # shadcn/ui (gerado, não editar à mão como se fosse seu)
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
   (`log.error`) em cada action. Ação de **criar**: `redirect()` para a
   ficha do registro após salvar (sempre fora do `try/catch`). Ação de
   **editar**: retorna `{ok:true}` e deixa o form mostrar um toast (ver
   `customer-form.tsx`/`vehicle-form.tsx`).
5. Reaproveitar `components/search-box.tsx` e
   `components/confirm-delete-button.tsx` em vez de duplicar. No
   `ConfirmDeleteButton`, passar a Server Action com `.bind(null, id)`,
   nunca uma arrow function nova — ver `docs/decisoes.md` (2026-09-22).
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
