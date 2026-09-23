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

## 2026-09-22 — Bugs reais achados testando contra o Supabase de verdade

Todos só apareceram rodando a aplicação de ponta a ponta (login real +
criar cliente + criar veículo) — nenhum quebrava `tsc`/build/lint/testes
unitários, porque são erros de runtime do React Server Components ou de
UX. Registrados aqui para não reintroduzir o mesmo erro em módulo novo:

- **Função passada de Server para Client Component**: `ModuleDefinition`
  guardava o ícone como o componente do lucide-react (`icon: LucideIcon`).
  `(app)/layout.tsx` (Server Component) passa `modules` para
  `SidebarNav`/`MobileNav` (Client Components) — React não serializa uma
  função nessa fronteira. Corrigido guardando `iconName: string` (nome do
  ícone) no registry e resolvendo para o componente só do lado do cliente,
  via `core/resolve-icon.tsx` (usa o export `icons` do lucide-react).
  **Regra geral**: nenhum campo de dado que atravessa Server → Client pode
  ser função/componente/classe — só o nome/id, resolvido no lado do
  cliente.
- **Closure passada como Server Action**: `onConfirm={() =>
deleteCustomer(customer.id)}` (arrow function nova, criada no Server
  Component) também não serializa. `deleteCustomer` é uma Server Action de
  verdade e por isso pode atravessar a fronteira, mas só a referência dela
  — use `.bind(null, id)` (como já era feito com `updateCustomer`), nunca
  embrulhe numa arrow function.
- **Sem feedback depois de criar um registro**: `createCustomer`/
  `createVehicle` só faziam `revalidatePath` + `return {ok:true}` — a tela
  não navegava nem mostrava nada, parecia que o clique não tinha feito
  nada (apesar de o registro ter sido salvo). Corrigido: toda Server
  Action de **criar** agora chama `redirect()` para a ficha do registro
  recém-criado (sempre FORA do `try/catch` — `redirect()` funciona lançando
  um erro especial que um `catch` genérico engoliria). Ações de
  **editar** continuam retornando `{ok:true}` (o usuário já está na
  página certa) e o form mostra um toast de sucesso via `useEffect`
  observando `state.ok`.
- **`Select` do Base UI não mostra o label sozinho**: diferente do Select
  do Radix, `Select.Value` (usado dentro de `SelectTrigger`) só mostra o
  **valor bruto** salvo (`"pf"`, o UUID do cliente) a menos que o `Select`
  raiz receba a prop `items` com o mapa valor → label
  (`items={{ pf: "Pessoa física", ... }}` ou, para listas dinâmicas,
  `items={Object.fromEntries(lista.map(x => [x.id, x.label]))}`). Todo
  `Select` novo precisa dessa prop, senão mostra o valor cru ao invés do
  texto legível.
- **`defaultValue` mudando depois de montado**: depois de salvar um
  registro, o Server Component busca dados frescos e repassa como prop —
  mas o form (Client Component) não remonta sozinho, e o Base UI avisa
  quando um campo não controlado recebe um `defaultValue` novo depois de
  inicializado. Corrigido dando `key={registro?.updatedAt?.toString()}`
  no `<form>` de criar/editar, forçando remontagem com os valores certos
  a cada save.

## 2026-09-22 — A conexão do app faz `bypassrls` (RLS não é a proteção ativa hoje)

Verificado direto no banco: `DATABASE_URL` (o pooler do Supabase) conecta
como o papel `postgres`, que tem `rolbypassrls = true`. Ou seja, **as
policies de RLS não protegem as queries do próprio app hoje** — quem
protege de verdade é o filtro manual por `organizationId` em todo
`queries.ts`/`actions.ts` via `withOrg()`. A RLS que existe é rede de
segurança só contra um caminho de acesso que o app não usa (alguém usando
a `anon key` do Supabase direto, via `@supabase/supabase-js`, sem passar
pelo Next.js).

**Por que isso fica assim por enquanto**: é o padrão comum de app Next.js

- Drizzle sobre Supabase (a maioria não usa o client JS do Supabase para
  dados, só para Auth). Mudar exigiria trocar a role da conexão ou usar
  `FORCE ROW LEVEL SECURITY`, e nenhuma das duas é urgente hoje.

**Por que isso vai importar na fase offline**: o PowerSync (escolhido para
sincronização offline) decide o que replica pra cada dispositivo _com base
nas policies de RLS_ — ele conecta como um papel que respeita RLS de
verdade. Quando essa fase começar, será preciso: (1) criar um papel
Postgres específico para o PowerSync sem `bypassrls`, e (2) auditar se
`apply_org_rls()` cobre exatamente as mesmas regras que `withOrg()` já
aplica manualmente hoje. Registrado aqui para não esquecer.

**Consequência prática agora**: o backend do painel de admin
(`src/core/admin/`) pode usar a mesma conexão (`core/db.ts`) sem precisar
de uma "chave de serviço" separada — ela já enxerga tudo, sem filtro de
organização. A única proteção do admin é a checagem de aplicação
(`requireAdmin()`), não o banco. Por isso toda query/action de admin
**tem que** passar por `requireAdmin()` antes de tocar no banco.

## 2026-09-22 — Modo suporte (admin agindo como uma oficina) via cookie, sem sessão falsa

Para o admin "entrar como se fosse" uma oficina (pedido explícito do
usuário: suporte remoto), a alternativa óbvia seria gerar uma sessão
Supabase Auth falsa para a organização. Não foi o caminho escolhido —
criar/assinar tokens de sessão por fora do fluxo normal do Supabase Auth é
superfície de ataque desnecessária. Em vez disso:

- Um cookie httpOnly (`core/impersonation.ts`) guarda só o id da
  organização. Sozinho, o cookie não dá acesso a nada.
- `core/auth.ts#getActiveOrg()` só honra esse cookie depois de reconfirmar
  — a cada request, não só na hora de criar o cookie — que o usuário da
  sessão **atual** (a sessão real do admin, nunca trocada) ainda está em
  `platform_admins`. Se alguém for removido de `platform_admins` no meio
  de uma sessão de suporte, a próxima request já cai fora.
- Contexto de impersonation vira `role: "owner"` para todos os efeitos —
  o admin em modo suporte tem exatamente o mesmo acesso que o dono da
  oficina teria, nunca mais.
- Expira sozinho em 2h (`IMPERSONATION_MAX_AGE_SECONDS`), e todo `logout()`
  limpa o cookie também.
- Todo log gerado em modo suporte carrega `userId` do **admin de verdade**
  (nunca troca de identidade de sessão) + `impersonating: true` no
  contexto — dá para auditar depois quem fez o quê.
- Bloqueio da oficina (`organizations.status = 'blocked'`) é ignorado só
  neste caminho — é exatamente quando o suporte costuma ser necessário.

## 2026-09-22 — Suporte ao vivo (co-browsing + controle remoto)

Pedido do usuário: o admin ver a tela do usuário em tempo real (com o
mouse se mexendo) e opcionalmente assumir o controle, com permissão dos
dois lados. Escolhido **co-browsing** (espelhar o DOM do app via
`rrweb`), não vídeo/WebRTC — grátis, leve, e só mostra o que está dentro
do MecanoErp (nunca a tela inteira do computador da pessoa).

**Modelo de consentimento**: os dois lados pedidos pelo usuário existem —
admin solicita (`requestSupportAccess`, a oficina aprova com um modal) e
a oficina chama (`callForSupport`, um botão flutuante em `(app)`, o admin
aceita). Os dois convergem para o mesmo estado (`live_sessions.status`:
`pending -> active -> ended`/`declined`) — a gravação só começa quando
`active`, do lado de quem está sendo observado, nunca antes.

**Transporte**: Supabase Realtime **Broadcast**, não Postgres Changes —
Postgres Changes exigiria RLS de verdade (a conexão do app ignora RLS,
ver decisão de "bypassrls" acima) para o navegador poder assinar a tabela
diretamente. Broadcast não depende disso; o nome de cada canal usa o
`id` da sessão (UUID imprevisível) como "senha" — mesmo modelo de
confiança de um link de videochamada. A autoridade de verdade continua
sendo sempre a linha em `live_sessions`, lida via Server Action; o
Broadcast só avisa "algo mudou, releia".

**Controle remoto**: sempre desligado por padrão mesmo com a sessão
`active` — o usuário concede numa ação separada (`controlGranted`,
`setControlGranted`), nunca junto do "permitir ver a tela". Quando
concedido, o clique do admin dentro do espelho vira
`document.elementFromPoint(x,y).click()` na página REAL do usuário; texto
digitado usa o truque do setter nativo de `.value` (ver
`apply-control-event.ts`) porque React ignora `elemento.value = x` direto.

**Bugs reais encontrados testando com dois navegadores simultâneos** (nenhum
pego por tsc/build/lint/testes unitários — todos de runtime/DOM):

- **`NEXT_PUBLIC_*` via `process.env[nomeDinâmico]` quebra no navegador**:
  `core/env.ts#requireEnv(name)` funciona perfeitamente no servidor (Node
  tem `process.env` completo em runtime), mas o Next só consegue embutir
  uma variável `NEXT_PUBLIC_*` no bundle do navegador quando vê o acesso
  escrito **literalmente** (`process.env.NEXT_PUBLIC_X`) — um acesso
  dinâmico por string vira `undefined` sem erro nenhum até alguém tentar
  usar o valor. Isso nunca tinha aparecido porque nada antes desta
  feature chamava `createSupabaseBrowserClient()` de um Client Component
  de verdade (o login usa Server Action). Corrigido em
  `core/supabase/client.ts` com acesso estático direto — ver o aviso
  agora em `core/env.ts`.
- **Iframe "rouba" o clique**: um `<iframe>` é outro contexto de
  navegação — `onClick`/`onMouseMove` no `<div>` que o envolve nunca
  disparam para posições sobre ele, a não ser que o iframe tenha
  `pointer-events: none`.
- **`Replayer` (a classe crua, sem `rrweb-player`) não escala a página
  pra caber**: ele renderiza o iframe no tamanho real gravado. Calcular a
  fração de clique em cima do `containerRef` (menor, recortado por
  `overflow`) dá coordenada errada — tem que ser em cima do
  `<iframe>` de verdade, que corresponde 1:1 à página do usuário.
- **rrweb rouba o foco do navegador do admin**: ao repetir o evento de
  foco que ele mesmo gravou do lado do usuário, o `Replayer` foca o
  próprio iframe de replay. Um listener de teclado que depende de algo
  ter foco nunca dispara de forma confiável depois disso — a solução foi
  capturar `keydown` em `window` (não no foco de um elemento) e, à parte,
  um `setInterval` curto que desfoca o iframe sempre que ele rouba o
  foco (um evento `focus` no documento pai nem sempre dispara quando o
  foco entra num iframe, então um listener de evento sozinho não bastava).
- **Canal do Realtime recriado a cada evento perde mensagens**: enviar
  cada tecla digitada criando um `supabase.channel(nome)` novo (em vez de
  reaproveitar um já inscrito) faz a maioria dos envios em sequência
  rápida sumir — sem erro, sem log, só não chegam. A correção foi guardar
  o canal já inscrito num `ref` e reaproveitá-lo em todo `.send()`.
- **Espelho só mostrava fundo cinza (bug relatado pelo usuário em teste
  manual real — não reproduzia numa oficina de teste vazia, só com dados
  reais)**: duas causas empilhadas, achadas em duas rodadas de depuração.
  1. **CSS ausente**: a classe crua `Replayer` (diferente do pacote
     `rrweb-player`) não injeta seu próprio CSS —
     `node_modules/rrweb/dist/style.css` nunca tinha sido importado. Sem
     ele, `.replayer-mouse`/`.replayer-mouse-tail` (cursor e canvas do
     rastro do mouse que o `Replayer` cria) ficam sem
     `position: absolute` e empilham em fluxo normal **acima** do
     iframe, cada um do tamanho da tela gravada — o wrapper acaba com o
     dobro da altura e o conteúdo real fica fora da janela visível, sem
     nenhum erro no console. Diagnosticado inspecionando
     `getBoundingClientRect()` do `.replayer-wrapper` via Playwright — a
     altura exatamente dobrada foi a pista. Corrigido importando
     `rrweb/dist/style.css` em `live-session-viewer.tsx`.
  2. **A causa de verdade, mais profunda**: o instantâneo completo do
     rrweb (`FullSnapshot`, o DOM inteiro da tela gravada) passa de
     **200KB mesmo numa oficina vazia** — bem acima do limite de tamanho
     de mensagem do Supabase Realtime Broadcast. `channel.send()`
     retorna `"ok"` (a chamada REST é aceita) mas o Realtime descarta o
     payload silenciosamente rio abaixo quando é grande demais — sem
     erro nenhum de nenhum lado. Numa oficina de teste vazia isso quase
     passava despercebido (perto do limite); com dados reais (o caso do
     usuário) sempre falhava. Corrigido trocando a arquitetura: o
     instantâneo completo não vai mais pelo Broadcast — o lado do
     usuário salva no banco via Server Action (`saveFullSnapshot`,
     coluna `live_sessions.last_full_snapshot`) e o admin busca sob
     demanda (`getFullSnapshot`) com **polling curto** (a cada 700ms, até
     30s) ao montar o visualizador — precisa ser polling, não uma
     tentativa única, porque existe uma corrida real entre a sessão
     virar `active` e o lado do usuário terminar de iniciar a gravação e
     salvar o primeiro instantâneo (150-350ms na prática). Só os eventos
     **incrementais** (mutações, mouse, cliques — algumas centenas de
     bytes cada) continuam indo pelo Broadcast, dentro do limite.
     Enquanto o instantâneo não chega, os incrementais que forem
     chegando ficam num buffer local e são aplicados assim que o
     `Replayer` é criado.
  - Um aperto de mão `viewer-ready` (admin avisa por broadcast que
    acabou de se inscrever) tinha sido adicionado numa tentativa anterior
    de corrigir isto fazendo `record.takeFullSnapshot()` — só piorava:
    um instantâneo novo mid-stream faz o rrweb fazer um "checkout" (nova
    numeração de nós do lado de quem grava) enquanto o admin já tinha
    montado o replayer com o instantâneo anterior, causando uma enxurrada
    de `Node with id X not found` e `target.setAttribute is not a
function` nos incrementais seguintes. Removido; sem necessidade
    depois do polling ativo.
  - Diagnóstico visível adicionado: badge vermelho de "erro de conexão"
    em `CHANNEL_ERROR`/`TIMED_OUT` do canal, e texto "Aguardando o
    primeiro quadro..." enquanto não chega nada.
- **Zoom e área maior no espelho**: o `Replayer` cru não escala a página
  pra caber no container. Antes disso rolava lateralmente sem dó, num
  container fixo de 480px. Agora o container é `75vh` e o zoom é feito à
  mão via CSS `transform: scale()` num wrapper dimensionado pro tamanho
  já escalado (pra o scroll do container acompanhar o zoom
  corretamente), com ajuste automático pra caber a largura toda assim
  que o primeiro quadro chega, e botões de +/-/ajustar.

## 2026-09-22 — Suporte ao vivo: mais 3 bugs reais (pedido do usuário some, espelho trava após navegação)

Depois da correção acima, o usuário reportou dois problemas novos em
teste manual: (1) quando a oficina chama o suporte (em vez do admin
pedir acesso), a tela do admin não mostra nada; (2) o clique remoto
funciona (a oficina navega de verdade) mas o espelho do admin não
acompanha a nova tela. Achados e corrigidos três bugs reais, nenhum
pego por tsc/lint/build:

- **Evento `Meta` também sofria da corrida do Broadcast**: o `Replayer`
  cria o iframe com `display: none` por padrão e só revela
  (`display: inherit`) ao aplicar um evento `Meta` (que carrega a
  largura/altura da tela gravada) — só esse evento ainda ia pelo
  Broadcast ao vivo (o `FullSnapshot` já tinha sido movido pro banco, ver
  entrada anterior). No fluxo "oficina chama o suporte", o admin demora
  mais pra se inscrever no canal (precisa navegar até a ficha da oficina
  primeiro, depois de aceitar no inbox) — tempo de sobra pro `Meta`
  chegar e se perder (Broadcast não guarda histórico pra quem chega
  depois). O conteúdo chegava a renderizar dentro do iframe, mas ele
  continuava invisível. Corrigido: o `Meta` mais recente agora vai
  **junto** do instantâneo completo salvo no banco
  (`saveFullSnapshot(sessionId, { meta, snapshot })`), aplicado pelo
  admin ANTES do `FullSnapshot` ao criar o `Replayer`.
- **A causa de verdade do espelho travar depois da primeira navegação —
  `useVirtualDom` do rrweb ativado sem querer**: pra evitar que o
  primeiro instantâneo/eventos iniciais entrassem numa fila com atraso
  (o `Replayer` só aplica de imediato eventos com timestamp anterior ao
  `baselineTime` capturado no `startLive()` — qualquer coisa "no futuro"
  relativo a esse instante fixo entra num timer baseado em tempo real
  decorrido — comportamento certo pra reproduzir uma gravação no ritmo
  original, errado pro nosso caso de espelhar ao vivo), passei um
  `baselineTime` bem no futuro pro `startLive()`, forçando todo evento a
  contar como "síncrono". Isso teve um efeito colateral não documentado
  no rrweb: `useVirtualDom` (ligado por padrão) só ativa quando um evento
  é tratado como síncrono — com TUDO síncrono agora, toda mutação
  incremental passou a ir pra uma representação **virtual** do DOM (uma
  otimização interna pra avanço rápido durante busca/seek), nunca
  aplicada de fato no iframe visível, e sem voltar ao modo normal (isso
  só acontece quando o replayer sai do modo síncrono, o que nunca
  acontecia mais). Resultado: toda mutação "aplicava com sucesso" (zero
  erro no console) mas nada mudava na tela — o espelho ficava
  permanentemente preso na primeira tela, confirmado via
  `MutationObserver` real no DOM do iframe (zero mutações detectadas).
  Corrigido desligando explicitamente `useVirtualDom: false` na
  configuração do `Replayer` — mutações incrementais voltam a aplicar
  direto no DOM real, sempre.
- Também ficou mais claro, depurando isto, que buffer de incrementais
  chegados **antes** do instantâneo completo ser buscado no banco (uma
  corrida separada, polling vs. inscrição no canal) não deve ser
  aplicado depois — são descartados (`pendingEventsRef` esvaziado sem
  aplicar), não guardados pra aplicar fora de ordem.

Diagnosticado com um `MutationObserver` real instalado dentro do
`contentDocument` do iframe espelhado (via Playwright, contra o Supabase
de verdade) contando mutações de fato — a pista decisiva de que o
problema era "aplica sem erro mas nada muda", não "falha silenciosa".

## 2026-09-22 — Suporte ao vivo: cursor do usuário sumiu, scroll remoto, contraste

Depois da correção do `useVirtualDom`, mais uma rodada de ajustes vindos
de teste manual:

- **Mouse do usuário parado no canto**: efeito colateral do
  `baselineTime` no futuro (ver entrada anterior) — forçar todo evento a
  contar como "síncrono" também muda o caminho que o rrweb usa pra
  `MouseMove`: no modo síncrono ele só guarda a posição internamente
  (`this.mousePos`), sem mover o cursor visualmente
  (`moveAndHover`), que só roda no caminho "não síncrono" (o normal, com
  timer). Revertido: `startLive()` volta a usar o padrão (sem
  `baselineTime` forçado) — o `useVirtualDom: false` sozinho já resolve a
  causa de verdade do espelho travar, sem precisar dessa forçação que
  quebrava o cursor.
- **Sem scroll remoto**: não existia. Adicionado `ControlEvent` do tipo
  `scroll` (`deltaX`/`deltaY`), aplicado como `window.scrollBy(...)` do
  lado do usuário. Precisou de um listener NATIVO de `wheel` com
  `{ passive: false }` no admin (não o `onWheel` do React — ele é
  anexado como passivo na raiz por padrão, então `preventDefault()` num
  handler JSX normal não bloqueia o scroll do navegador, e o container
  local rolaria junto com a página remota).
- **Botão "Encerrar"/toggle brancos no banner do usuário**: o banner
  (`bg-blue-600 ... text-white`) definia `text-white` uma vez no
  container pai; o botão `variant="outline"` não tem cor de texto
  própria (herda do ancestral) e ganhava `bg-white` — texto branco em
  fundo branco, invisível. Corrigido com `text-foreground` explícito no
  botão.
- **Cursor piscando ao digitar remotamente, limitação conhecida, não
  corrigida**: o rrweb, com `triggerFocus` (padrão), chama `.focus()` de
  verdade no elemento dentro do iframe ao repetir o evento de foco
  gravado — o que MOSTRARIA o cursor piscando nativo. Só que isso também
  foca o `<iframe>` do ponto de vista do admin, e o polling que desfoca o
  iframe a cada 100ms (pra evitar que ele roube o teclado do admin, ver
  entrada de "Suporte ao vivo" acima) cancela esse foco também — o valor
  digitado aparece certo (via mutação normal), só sem o cursor piscando.
  Não mexido: resolver isso direito exigiria repensar o mecanismo de
  proteção do teclado, risco maior que o ganho cosmético por agora.

## 2026-09-22 — Suporte ao vivo: destaque de campo, sino global, sessão sumindo sozinha

Mais uma rodada, incluindo a correção do "cursor piscando" que a entrada
anterior tinha deixado como limitação conhecida:

- **Destaque do campo focado resolvido**: o `target` de um evento
  `mouse-interaction` do `Replayer` vem do `contentDocument` do iframe —
  **outro realm de JavaScript**, com seu próprio `HTMLElement`. A checagem
  `target instanceof HTMLElement` (usando a classe do realm de FORA, a
  página do admin) sempre dá falso, mesmo pra um elemento real — um
  clássico problema de `instanceof` entre realms diferentes. Trocado por
  checagem "por pato" (`isStyledElement`: tem `.style`?), que funciona em
  qualquer realm. Com isso, o contorno azul no campo focado (a
  alternativa ao cursor nativo, já que esse não dá pra mostrar — ver
  entrada anterior) finalmente aparece.
- **Sino de notificação no cabeçalho do admin**: `SupportInbox` só
  existia na página inicial (`/admin`) — um admin na ficha de outra
  oficina não via nada quando alguém chamava o suporte. Novo
  `SupportNotificationBell` no `layout.tsx` de `/admin/*` (visível em
  toda página da área admin), com toast ao vivo e dropdown listando os
  pedidos pendentes; clicar num pedido aceita e leva pra ficha da
  oficina.
- **Sessão "Ao vivo" aparecia e sumia sozinha, sem erro nenhum, ao
  aceitar por qualquer um dos inboxes (sino ou card)**: o `router.push()`
  do Next.js, navegando pra uma rota que o navegador já tinha uma versão
  em cache (prefetch de antes da sessão virar `active`), mostrava a tela
  correta por um instante e depois voltava pra "Solicitar acesso" quando
  esse cache antigo resolvia por cima — uma corrida de dados sem
  qualquer mensagem de erro. Tentei `router.refresh()` também, que só
  piorou (criava uma SEGUNDA busca concorrente com a do `push`, uma
  cancelando a outra — "stream closed early" no log do servidor).
  Corrigido trocando por `window.location.href` (recarregamento
  completo): mais lento, mas garante exatamente UMA busca sempre fresca,
  sem essa ambiguidade de cache do router. Diagnosticado rodando um
  `for` de 10 segundos checando "Ao vivo" a cada 1s — sem isso, um teste
  rápido de "apareceu?" não pegava o problema.
- Banner do usuário e botão "Encerrar" redesenhados: em vez de forçar
  cor em cada componente por cima de um fundo azul sólido, os controles
  (toggle + botão) ficam dentro de um "pill" branco — usam as cores
  padrão deles mesmos (pensadas pra fundo claro), sem risco de
  ilegibilidade.

## 2026-09-22 — Nome do projeto: MecanoErp

Pasta local e repositório GitHub (`ifelseprogramador/MecanoErp`) usam
`mecano-erp` (kebab-case) como nome técnico; `MecanoErp` é o nome exibido
na UI/README. Antes disso o projeto era um placeholder chamado
`oficina-erp`.
