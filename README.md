# MecanoErp

ERP enxuto para oficinas mecânicas de pequeno porte (uma pessoa cuidando do
balcão): clientes, veículos, ordens de serviço, orçamento, agenda e
financeiro. Arquitetura modular — cada funcionalidade é uma pasta
autocontida em `src/modules/`, fácil de adicionar ou remover. Veja
[`docs/`](./docs/README.md) para a documentação de arquitetura e decisões
técnicas, e o plano completo em
`/home/eduardo/.claude/plans/quero-fazer-um-erp-modular-teacup.md`.

## Stack

Next.js (App Router) + TypeScript + Supabase (Postgres/Auth) + Drizzle ORM +
Tailwind + shadcn/ui. Testes com Vitest + Testing Library + Playwright. Tudo
com tier gratuito. Detalhes e justificativa de cada escolha estão no plano
linkado acima.

## Setup local (5 passos)

1. **Dependências**

   ```bash
   npm install
   ```

2. **Projeto no Supabase**: crie um projeto grátis em
   [supabase.com/dashboard](https://supabase.com/dashboard).

3. **Variáveis de ambiente**

   ```bash
   cp .env.example .env.local
   ```

   Preencha com os valores do seu projeto (Project Settings -> API e ->
   Database -> Connection string, pooler em modo _Transaction_).

4. **Banco de dados**

   ```bash
   npm run db:generate   # gera as migrations a partir de src/db/schema.ts
   npm run db:migrate    # aplica no banco configurado em DATABASE_URL
   npm run db:seed       # cria a oficina de teste, o usuário dela e você
                          # como dono da plataforma (preencha
                          # SEED_ADMIN_EMAIL/PASSWORD no .env.local com o
                          # SEU login antes de rodar)
   ```

5. **Rodar**

   ```bash
   npm run dev
   ```

   Abra [http://localhost:3000](http://localhost:3000) para o app da
   oficina, ou [http://localhost:3000/admin](http://localhost:3000/admin)
   para o painel do dono da plataforma (login de `SEED_ADMIN_EMAIL`).

## Scripts

| Comando             | O que faz                                                        |
| ------------------- | ---------------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                                      |
| `npm run build`     | Build de produção                                                |
| `npm run check`     | A mesma esteira do CI, local: format + lint + typecheck + testes |
| `npm run test`      | Testes unitários/componente (Vitest)                             |
| `npm run test:e2e`  | Testes end-to-end (Playwright)                                   |
| `npm run db:studio` | UI do Drizzle para inspecionar o banco                           |

## Qualidade de código

- **Testes**: todo módulo tem `__tests__/` ao lado do código. Lógica de
  negócio pura (cálculo de totais, centavos, máquina de estados da OS) tem
  teste unitário obrigatório. Todo bug corrigido ganha primeiro um teste
  que falha reproduzindo-o.
- **Pre-commit**: Husky + lint-staged rodam Prettier/ESLint/`tsc` nos
  arquivos tocados antes de cada commit.
- **CI**: `.github/workflows/ci.yml` roda a mesma esteira do
  `npm run check` em cada push/PR.

## Observabilidade (achar o erro rápido)

- Use sempre `logger` de `src/core/logger.ts` — nunca `console.*` direto
  (o ESLint bloqueia). Dentro de uma Server Action, prefira o logger já
  contextualizado que `withOrg()` devolve (`core/auth.ts`): ele já carrega
  `requestId`, `userId` e `organizationId` em todo log.
- Toda falha inesperada mostra ao usuário um código curto (o `requestId`
  da request) — é o que ele lê pelo telefone para você achar o log exato.
- Em dev, os logs aparecem no terminal. Em produção (Vercel), em **Vercel
  Logs**, buscáveis por `requestId`/`organizationId` (formato JSON).

## Arquitetura modular

Cada funcionalidade vive em `src/modules/<modulo>/` (schema, validação,
queries, actions, componentes) e se registra no menu via
`src/core/load-modules.ts` + `src/core/registry.ts`. Um módulo nunca
importa outro diretamente — só `core/` e `components/ui/`. Remover uma
funcionalidade é apagar a pasta e tirar a linha de `load-modules.ts`. A
receita completa de como criar um módulo novo está em
[`docs/arquitetura.md`](./docs/arquitetura.md#convenções-de-módulo-o-que-copiar-do-template).

Separado dos módulos de negócio existe o painel do dono da plataforma
(`/admin`): bloquear/desbloquear oficinas, controlar cobrança mensal
manualmente, personalizar quais módulos cada oficina enxerga, e apagar
todos os dados de uma oficina. Ver
[`docs/arquitetura.md`](./docs/arquitetura.md#área-do-dono-da-plataforma-admin).

## Vulnerabilidade conhecida (dev-only)

`npm audit` acusa uma vulnerabilidade moderada no `esbuild` embutido no
`drizzle-kit` (servidor de dev do esbuild aceita requests de qualquer
origem). Afeta só o ambiente local de desenvolvimento, não o build de
produção nem o runtime. Corrigir exigiria fazer downgrade do `drizzle-kit`
para uma versão bem mais antiga — vale revisar quando o `drizzle-kit`
atualizar a dependência internamente.
