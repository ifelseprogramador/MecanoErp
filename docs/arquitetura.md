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
    db.ts, auth.ts, logger.ts, registry.ts, load-modules.ts,
    action-result.ts, money.ts, format.ts, document.ts, env.ts
  components/
    ui/            # shadcn/ui (gerado, não editar à mão como se fosse seu)
    search-box.tsx, confirm-delete-button.tsx  # genéricos entre módulos
db/
  schema.ts               # reexporta o schema.ts de cada módulo
  schema/tenancy.ts         # organizations + memberships (fundação, não módulo)
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
