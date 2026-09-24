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

## Publicar na internet (Vercel)

O app roda no **Vercel**, na região **São Paulo (`gru1`)**, a mesma do
banco no Supabase (`sa-east-1`). App e banco na mesma cidade é o que
deixa as telas rápidas: cada consulta leva ~30ms em vez de ~150–200ms.
A região e o backup diário já estão configurados em `vercel.json`, não
precisa mexer.

1. **Criar a conta** em [vercel.com](https://vercel.com) entrando com a
   conta do GitHub.
2. **Importar o projeto**: _Add New… → Project_ → escolher o repositório
   `MecanoErp` → _Import_. O Vercel detecta o Next.js sozinho, não mude
   nada em _Build Settings_.
3. **Variáveis de ambiente** (na mesma tela, em _Environment Variables_,
   ou depois em _Project Settings → Environment Variables_). Copie os
   valores do seu `.env.local`:

   | Variável                        | Observação                                                         |
   | ------------------------------- | ------------------------------------------------------------------ |
   | `NEXT_PUBLIC_SUPABASE_URL`      | igual ao `.env.local`                                              |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | igual ao `.env.local`                                              |
   | `SUPABASE_SERVICE_ROLE_KEY`     | igual ao `.env.local` — **secreta**, nunca exponha                 |
   | `DATABASE_URL`                  | a do **pooler** (`…pooler.supabase.com:6543`), nunca `db.…:5432`   |
   | `CRON_SECRET`                   | um valor aleatório **novo** (ex.: `openssl rand -hex 32`), secreto |

   As `SEED_*` não vão pro Vercel — só servem pro script de seed local.

4. **Deploy**: clicar _Deploy_. Em ~2 minutos sai o endereço
   (`https://mecano-erp-xxxx.vercel.app`). A partir daí, **todo `git push`
   na `main` publica sozinho** (e o CI continua rodando no GitHub).
5. **Conferir**:
   - _Project Settings → Functions → Function Region_ deve mostrar
     **São Paulo (gru1)**.
   - Abrir `https://SEU-ENDERECO/api/health` — deve mostrar
     `{"status":"ok","database":"ok"}`.
   - _Project Settings → Cron Jobs_ deve listar `/api/cron/backup` (roda
     todo dia às 3h de Brasília).
6. **(Opcional) Endereço próprio** (ex.: `app.mecanoerp.com.br`):
   _Project Settings → Domains_.

**Banco:** as migrations não rodam no deploy. Quando uma mudança trouxer
migration nova, rode `npm run db:migrate` do seu computador (o
`.env.local` aponta pro mesmo Supabase de produção) antes ou logo depois
do push.

**Custo:** o plano grátis do Vercel (Hobby) é só para uso não comercial.
Quando as oficinas começarem a pagar, é preciso o plano Pro (confira o
preço atual em vercel.com/pricing). No Supabase, o plano pago traz
backup automático do banco inteiro. O backup diário do próprio app
(página _Backup_) funciona em qualquer plano.

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
manualmente, personalizar quais módulos cada oficina enxerga, apagar
todos os dados de uma oficina, e uma trilha de auditoria de tudo isso.
Ver [`docs/arquitetura.md`](./docs/arquitetura.md#área-do-dono-da-plataforma-admin).

Tem também **suporte ao vivo**: o admin pode ver a tela do app de uma
oficina em tempo real (com o mouse se mexendo) e, se autorizado,
controlar remotamente — útil pra ajudar alguém sem precisar de
TeamViewer. Funciona nos dois sentidos: o admin solicita acesso, ou a
oficina chama o suporte (botão flutuante dentro do app). Ver
[`docs/arquitetura.md`](./docs/arquitetura.md#suporte-ao-vivo-co-browsing--controle-remoto).

## Vulnerabilidade conhecida (dev-only)

`npm audit` acusa uma vulnerabilidade moderada no `esbuild` embutido no
`drizzle-kit` (servidor de dev do esbuild aceita requests de qualquer
origem). Afeta só o ambiente local de desenvolvimento, não o build de
produção nem o runtime. Corrigir exigiria fazer downgrade do `drizzle-kit`
para uma versão bem mais antiga — vale revisar quando o `drizzle-kit`
atualizar a dependência internamente.
