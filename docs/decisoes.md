# Decisões técnicas

Log curto (estilo ADR) das escolhas de stack/arquitetura e por quê. Atualizar
sempre que uma decisão for tomada ou revista — não deixar para o fim.

## 2026-09-21 — Stack base

Next.js (App Router) + TypeScript + Supabase (Postgres/Auth/RLS) + Drizzle
ORM + Tailwind + shadcn/ui. Free tier em tudo, deploy na Vercel. Ver
`docs/arquitetura.md` para o porquê de cada peça.

## 2026-09-21 — Modularidade por pasta, não por pacote

Cada funcionalidade é uma pasta autocontida em `src/modules/<modulo>/`
(schema, validação, queries, actions, componentes), registrada em
`core/load-modules.ts`. Preferido a um monorepo com pacotes npm separados
por ser mais simples de manter sozinho e ainda cumprir o requisito de
"adicionar/remover funcionalidade rapidamente" (apagar a pasta + tirar uma
linha do registry).

## 2026-09-21 — RLS sempre em migration custom, nunca no schema Drizzle

`drizzle-orm` suporta `pgPolicy` direto no `pgTable(...)`, o que pareceria
mais "auto-contido" por módulo. Não foi usado: `drizzle-kit generate` geraria
o `CREATE POLICY` dentro da MESMA migration que cria a tabela, e essa
policy referencia `current_org_ids()` — uma função SQL que só existe depois
de rodar a migration custom `0001_rls_policies.sql`. Como `src/db/migrate.ts`
aplica **todas** as migrations do drizzle-kit antes de **todas** as
migrations custom, colocar a policy dentro do schema do Drizzle quebraria
a ordem (policy tentando referenciar uma função que ainda não existe).
Solução: tabelas só em `schema.ts` (Drizzle); toda RLS numa migration custom
correspondente em `src/db/migrations-custom/`, usando o helper
`apply_org_rls(table_name)` (definido em `0001_rls_policies.sql`) para não
reescrever as 4 policies em cada módulo novo.

## 2026-09-21 — shadcn/ui sobre Base UI, não Radix

A versão instalada do `shadcn` (4.21) gera componentes sobre `@base-ui/react`
por padrão, não Radix UI (o que a maioria dos exemplos/tutoriais por aí
ainda assume). Isso muda a API de composição: onde Radix usa `asChild` +
elemento filho, Base UI usa a prop `render={<Elemento />}` com os children
declarados no componente externo. Ver exemplos em `src/components/ui/dialog.tsx`
e qualquer uso de `Button render={...}` no projeto.

## 2026-09-21 — `@tanstack/react-table` removido do projeto

A v9 (atual, a v8 não é mais publicada) trocou a API inteira: `useReactTable`
virou `useTable`, `getCoreRowModel()` virou registro de features via
`tableFeatures({...})`. Para o volume do MVP (lista de clientes/veículos de
uma oficina) isso é complexidade sem retorno — as tabelas de listagem são
renderizadas direto com os componentes `Table` do shadcn/ui, sem lib.
Reavaliar se algum dia sort/filtro/paginação client-side virar necessidade
real (dataset grande).

## 2026-09-21 — Next.js 16: `middleware.ts` → `proxy.ts`, `error.tsx` usa `retry`

Breaking changes do Next 16 relevantes para este projeto:

- `middleware.ts` foi renomeado para `proxy.ts` (mesma semântica, export
  `proxy` em vez de `middleware`).
- `error.tsx` recebe `retry()` como prop preferida no lugar de `reset()`
  (`reset` ainda existe mas é desencorajado).
- `error.digest` é o identificador que o Next já grava junto do log do
  servidor para erros de Server Component — usado como o "código de erro"
  mostrado ao usuário (ver `core/logger.ts` / `src/app/error.tsx`).

## 2026-09-22 — Nome do projeto: MecanoErp

Pasta local e repositório GitHub (`ifelseprogramador/MecanoErp`) usam
`mecano-erp` (kebab-case) como nome técnico; `MecanoErp` é o nome exibido
na UI/README. Antes disso o projeto era um placeholder chamado
`oficina-erp`.
