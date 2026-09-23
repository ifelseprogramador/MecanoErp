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

## 2026-09-22 — Ajustes finais de contraste + destaque de campo mais robusto

Depois de "ficou bom", mais três pedidos pequenos:

- **Toggle "Controle remoto" invisível quando desligado**: o cinza claro
  padrão do `Switch` (pensado pra fundo branco comum) quase sumia em
  cima do "pill" com leve tom azulado do banner. Escurecido só nesta
  instância (`data-unchecked:bg-zinc-400`).
- **Botão "Encerrar" ilegível**: trocado de `variant="outline"`/`"ghost"`
  pra `"destructive"` (fundo vermelho suave, ícone e texto vermelhos) —
  nos dois lados, usuário e admin.
- **Destaque do campo focado reforçado**: testei e confirmei que o
  contorno azul (da entrada anterior) aplicava certo em ambiente de
  teste, mas o usuário reportou "nada muda visualmente" no uso real
  (sem erro no console). Sem conseguir reproduzir a falha exata, troquei
  por um destaque bem mais robusto e difícil de "sumir" em qualquer
  layout: `outline` + `background-color` + `box-shadow`, todos com
  `!important` (via `style.setProperty(..., "important")`, não a
  atribuição direta de `style.outline = ...`) — cobre o caso de um campo
  já ter `background`/`box-shadow` próprios via classe (ex.: inputs do
  shadcn/ui) que ganhariam de um style inline comum.
- **Notificação de pedido de suporte sem botão de fechar**: `<Toaster>`
  (raiz do app, `src/app/layout.tsx`) ganhou `closeButton` — vale pra
  todo toast do app, não só o de suporte, mas é uma melhoria de UX
  razoável em geral (toast dispensável na hora, não só por timeout).

## 2026-09-22 — Nome do projeto: MecanoErp

Pasta local e repositório GitHub (`ifelseprogramador/MecanoErp`) usam
`mecano-erp` (kebab-case) como nome técnico; `MecanoErp` é o nome exibido
na UI/README. Antes disso o projeto era um placeholder chamado
`oficina-erp`.

## 2026-09-23 — Fase 3: módulo `catalogo` (serviços e peças)

Primeiro módulo desde a Fase 2 (clientes/veículos) — retomando o plano
original depois do desvio de várias rodadas em cima do suporte ao vivo.
Segue exatamente o template de `veiculos`: `catalog_items` (tipo
servico/peca, nome, unidade, preço padrão em centavos), RLS via
`apply_org_rls('catalog_items')`, barrel (`index.ts`) expondo só
`searchCatalogItems`/`CatalogItem` — é o que o editor de itens da OS
(próximo módulo) vai importar, nunca `schema.ts`/`queries.ts` direto.

Novidade: `core/money.ts` ganhou `parseReaisInput(texto)` — converte o
que a pessoa digita num campo de preço ("150,90", "150.90", "1.234,56")
para centavos, aceitando vírgula OU ponto decimal (`type="text"`, não
`type="number"`, de propósito: evita o parsing de decimal por locale do
input numérico nativo, que varia por navegador/SO). Usado pela primeira
vez aqui; vai se repetir em `ordens` (preço/desconto) e depois
`financeiro`.

## 2026-09-23 — Fase 3: módulo `ordens` (o coração do sistema)

Orçamento não é uma entidade separada — é uma `work_order` com
`status = 'orcamento'`; "aprovar" é só a transição pra `aprovada`. Zero
duplicação de modelo, como o plano original previa.

- **Máquina de estados como função pura, testada sem banco**
  (`domain.ts#isValidTransition`): `orcamento -> aprovada | cancelada`,
  `aprovada -> em_andamento | cancelada`, `em_andamento -> concluida |
cancelada`, `concluida -> entregue`. `entregue`/`cancelada` são
  terminais. `actions.ts#transitionWorkOrderStatus` consulta essa função
  antes de qualquer `UPDATE` — o banco nunca fica num estado que a UI não
  sabe representar (pular de orçamento direto pra concluída, por
  exemplo).
- **Número sequencial da OS por oficina**: não dá pra usar uma
  `SEQUENCE` nativa do Postgres (é global, não por tenant). Tabela
  `work_order_counters` (uma linha por organização) com um
  `INSERT ... ON CONFLICT DO UPDATE SET last_number = last_number + 1
RETURNING` — uma única instrução atômica, sem corrida entre duas OSs
  criadas ao mesmo tempo na mesma oficina.
- **Total da OS é recalculado pela aplicação, não coluna gerada**: o
  total de cada **item** (`work_order_items.total_cents`) é
  `GENERATED ALWAYS AS (round(quantity * unit_price_cents)) STORED` de
  verdade (só depende de colunas da própria linha). O total da **OS**
  não pode ser gerado assim — depende da tabela filha `work_order_items`,
  e o Postgres não permite `GENERATED ALWAYS AS` referenciar outra
  tabela. Por isso `actions.ts#recalculateOrderTotal` é chamado depois
  de toda mutação de item ou de desconto e grava o total via
  `domain.ts#calculateOrderTotal` (também função pura, testada
  isoladamente).
- **`work_order_items` não tem `organization_id` próprio** (só
  `work_order_id`) — `apply_org_rls()` (o helper genérico) não serve
  aqui. RLS escrita à mão em `migrations-custom/0007_ordens_rls.sql` com
  as 4 policies fazendo `work_order_id in (select id from work_orders
where organization_id in (select current_org_ids()))`. `queries.ts` faz
  o mesmo join na leitura, de propósito — mesmo com RLS não sendo a
  proteção ativa hoje (bypassrls), a query não devia confiar só no
  `work_order_id` vir de um contexto já validado.
- **Impressão sem dependência nenhuma**: `/ordens/[id]/imprimir` reaproveita
  a mesma auth/dados de sempre, só que numa página sem a casca do app —
  `(app)/layout.tsx` ganhou classes `print:hidden` na sidebar/topo e
  `print:p-0` no `<main>`. Ctrl+P do navegador serve tanto pra imprimir
  quanto "salvar como PDF" — zero lib de geração de PDF no servidor.

Testado de ponta a ponta no navegador: fluxo completo
orçamento→aprovada→em_andamento→concluída→entregue, item vindo do
catálogo (autofill de nome/tipo/preço) e item avulso, remoção de item
recalculando o total, cancelamento a partir de qualquer estado não
terminal, impressão mostrando os dados certos, e 22 testes unitários
novos (máquina de estados + cálculo de total + validação Zod).

## 2026-09-23 — CI quebrado: `PageProps`/`LayoutProps` não existem num checkout limpo

`npm run typecheck` (`tsc --noEmit`) rodando sozinho, sem nunca ter
passado por `next dev`/`next build` antes, falhava com
`Cannot find name 'PageProps'` em toda página nova. Nunca apareceu
rodando local porque este diretório sempre teve um `.next/` de alguma
sessão de `dev`/`build` anterior — só apareceu no CI (checkout limpo a
cada run).

Causa: `PageProps`/`LayoutProps` são tipos que o Next.js **gera**
(`.next/types/**/*.ts`, já listado no `include` do `tsconfig.json`) a
partir das rotas existentes — não existem até o Next processar o
`app/` pelo menos uma vez. O workflow (`ci.yml`) roda "Checagem de
tipos" **antes** de "Build de produção", então num checkout novo esses
tipos simplesmente não existem ainda quando o `tsc` roda.

Corrigido trocando o script `typecheck` de `tsc --noEmit` para
`next typegen && tsc --noEmit` — `next typegen` (Next.js 16) gera só os
tipos de rota, sem build completo, bem mais rápido que rodar `next
build` cedo demais só para gerar tipos. Confirmado rodando com
`.next/` apagado antes.

## 2026-09-23 — Offline-first: PWA + fila local, não PowerSync

Pergunta que motivou a decisão: "e se ficar sem internet o dia inteiro?"
— a oficina precisa continuar cadastrando cliente/veículo/OS mesmo sem
conexão, e sincronizar sozinho quando ela voltar. Avaliadas duas rotas:
PowerSync (motor de sync genérico, replica um banco local inteiro) e uma
versão mais simples — service worker cacheando páginas já visitadas (só
leitura) + fila de ações pendentes em IndexedDB (só escrita). Escolhida a
segunda: cobre o caso real (balcão continua CRIANDO o dia inteiro) sem
trazer um motor de sincronização genérico e sua complexidade operacional
para um MVP de oficina única. Trade-off aceito conscientemente: só fica
disponível pra LEITURA offline o que já foi visitado antes (não é um
banco local completo) — na prática isso cobre bem o uso real, já que o
balcão folheia as listas o dia inteiro de qualquer forma.

Peças, todas em `src/core/offline/`:

- `public/sw.js` — service worker só de leitura. Nunca intercepta
  requisição que não seja GET (Server Action é POST — não dá pra
  responder por ela aqui sem quebrar o formato que o RSC espera de
  volta). Navegação de página (`request.mode === "navigate"`):
  network-first, cai pro cache da última visita se offline, e por
  último numa página `/offline` genérica se a rota nunca foi visitada.
  `/_next/static/` é cache-first (conteúdo tem hash no nome, nunca muda
  pra uma mesma URL).
- `db.ts`/`queue.ts` — fila de `PendingAction` em IndexedDB (via `idb`),
  um evento de `window` (`QUEUE_CHANGED_EVENT`) pra UI reagir sem
  precisar dar poll.
- `use-offline-create-action.ts` — envolve uma Server Action de criar:
  se `navigator.onLine` é falso, ou se a chamada falhar com um erro que
  parece de rede (`TypeError` de `fetch`), grava na fila local em vez de
  chamar o servidor, com um `id` gerado no cliente
  (`crypto.randomUUID()`) que **é o mesmo id usado no insert real
  quando sincronizar** — sem remapear URL/id depois.
- `sync-engine.ts` — ao voltar a conexão (`sync-provider.tsx`, montado
  em `(app)/layout.tsx`, só dentro da área autenticada), reprocessa a
  fila **sequencialmente, nunca em paralelo**, e **para no primeiro
  erro**: não dá pra distinguir barato "erro de validação de verdade" de
  "essa ação depende de outra que ainda não sincronizou" (ex.: veículo
  que referencia um cliente criado na mesma sessão offline) — parar
  sempre é mais seguro que arriscar sincronizar fora de ordem.
- `replay-handlers.ts` — mapa `"modulo:actionName" -> função`, mora em
  `core/` (não dentro do módulo) pelo mesmo motivo de
  `core/load-modules.ts`: por natureza precisa conhecer vários módulos.

**Armadilhas reais encontradas testando com Playwright
(`context.setOffline`) contra build de produção** (dev mode com
Turbopack/HMR não hidrata direito uma página servida pelo cache do SW
offline — testar sempre com `npm run build && npm run start`):

- **Rota "pendente" tem que ser estática, nunca `/rota/[id]`**: o
  roteador do Next tenta buscar o payload RSC do destino antes de
  navegar — falha offline pra um id nunca visto, cai pra navegação de
  browser de verdade, que o SW também não tem cacheado (URL nova, nunca
  visitada). Resolvido usando `/clientes/pendente?id=xxx` (caminho
  estático, pré-cacheável) em vez de `/clientes/pendente/[id]`, e
  navegando com `window.location.href` (não `router.push()`, que ainda
  tentaria buscar o RSC primeiro).
- **`router.prefetch()` não é suficiente pra evitar `ChunkLoadError`**:
  ele garante o payload RSC da rota, mas na prática nem sempre baixa
  os chunks JavaScript da própria página — offline, sem esses chunks em
  cache, a hidratação falha com `ChunkLoadError`. Resolvido com um
  `import()` dinâmico explícito do módulo da página
  (`sync-provider.tsx`), que força o navegador a buscar e EXECUTAR o
  chunk de verdade (passando pelo service worker, que cacheia).
- **`router.prefetch()` cacheia o formato ERRADO pra fallback de
  navegação**: o que ele guarda no Cache Storage é o payload RSC (só
  serve pra requisição com os headers especiais que o roteador do Next
  manda), não o HTML completo que uma navegação de página cheia (ou
  `fetch()` cru) recebe. O SW em modo "navigate" precisa do HTML
  completo. Resolvido fazendo TAMBÉM um `fetch()` cru client-side da
  rota e escrevendo direto no mesmo Cache Storage que o SW lê
  (`caches.open(SW_CACHE_NAME).then(cache => cache.put(...))` —
  `caches` é compartilhado entre a aba e o service worker na mesma
  origem).
- **`useSearchParams()` exige `<Suspense>`, e isso atrapalha o
  prefetch**: com Partial Prerendering, o Next não inclui o JS de
  dentro de um limite `<Suspense>` no `router.prefetch()` — só busca de
  verdade na navegação real. Como a rota `/clientes/pendente` não
  depende de nada do servidor, trocado `useSearchParams()` por ler
  `window.location.search` direto num efeito (sem `Suspense`),
  eliminando o boundary que causava o problema.
- **Service worker não pode pré-cachear rota autenticada estando
  deslogado**: `SyncProvider` mora só em `(app)/layout.tsx` (nunca no
  layout raiz, que também serve `/login`) — senão a instalação do SW
  podia rodar antes do login, cachear a tela de "sessão expirou" sob a
  chave da rota protegida, e mostrar isso pra sempre offline.
- **Primeira navegação depois do login não fica sob controle do SW
  ainda** (ele só assume controle numa navegação seguinte à própria
  instalação) — por isso o cache real de uma rota só existe a partir da
  SEGUNDA vez que ela é visitada na sessão do navegador; é esperado, não
  um bug (o app funciona normalmente, só a leitura offline daquela rota
  específica fica disponível a partir da visita seguinte).

Testado de ponta a ponta com Playwright contra build de produção e
Supabase real: criar cliente offline → ficha "pendente" hidrata offline
com o dado certo e o badge de pendência → aparece na listagem de
clientes mesmo offline → volta a conexão → sincroniza sozinho (toast +
recarrega a lista) → a ficha de verdade (`/clientes/{id}`) mostra o
mesmo cliente, com o MESMO id gerado no cliente.

Ainda falta (não é bug, é próximo passo): repetir o mesmo padrão pros
módulos `veiculos`, `catalogo` e `ordens`; para `ordens` especificamente,
ainda falta decidir como tratar o número sequencial da OS quando criada
offline (colisão de numeração ao sincronizar mais de uma OS criada sem
conexão) — número provisório local, confirmado só na sincronização.

## 2026-09-23 — Offline-first: `veiculos` (segunda aplicação do padrão)

Pedido explícito do usuário nesta rodada: tarja avisando "sem conexão,
vai sincronizar sozinho quando voltar" e um aviso quando a sincronização
terminar. As duas coisas **já existiam** desde a implementação de
`clientes` (`SyncProvider`, montado globalmente em `(app)/layout.tsx` —
vale pra qualquer página, não só clientes): tarja escura offline, tarja
âmbar com contagem + toast quando sincroniza. Só ajustado o texto da
tarja offline pra bater literalmente com o pedido ("...será
sincronizado assim que a internet voltar").

O trabalho de verdade desta rodada foi replicar o suporte de CRIAÇÃO
offline pro módulo `veiculos`, confirmando que o template de `clientes`
generaliza sem ajuste nas peças de `core/offline/` (fila, engine,
`useOfflineCreateAction`, `db.ts` — nenhuma delas tem nada específico de
cliente). O que foi copiado/adaptado por módulo, iguais aos passos já
documentados no header de `core/offline/replay-handlers.ts`:

1. `actions.ts`: extraído `createVehicleRecord(data, id?)` — mesmo
   padrão de `createCustomerRecord` (sem `redirect`, `withOrg()` próprio,
   aceita `id` opcional pro id gerado no navegador).
2. `replay-handlers.ts`: registrada a entrada
   `"veiculos:createVehicle"`.
3. `components/new-vehicle-form.tsx`: wrapper com
   `useOfflineCreateAction`, repassando as props extras que
   `VehicleForm` tem e `CustomerForm` não tem (`customers`,
   `defaultCustomerId`).
4. `(app)/veiculos/pendente/page.tsx` +
   `components/pending-vehicles.tsx`: cópias adaptadas das
   equivalentes de clientes, mostrando os campos do veículo.
5. `sync-provider.tsx`: rota `/veiculos/pendente` adicionada em
   `PENDING_ROUTES`.

**Detalhe que não é bug, é limitação aceita**: `vehicleSchema` exige um
`customerId` de um cliente que já existe — o seletor do formulário só
lista clientes já sincronizados (vindos do servidor). Criar um veículo
offline pra um cliente **também** criado offline, na mesma sessão sem
conexão, funciona (o motor de sync processa a fila em ordem cronológica
— o cliente sincroniza primeiro, satisfazendo a FK do veículo), mas o
select do formulário não vai listar esse cliente ainda pendente
enquanto estiver offline (só existe no IndexedDB, não na lista vinda do
servidor). Cobre o caso comum (cliente já cadastrado, veículo novo);
não cobre cadastrar os dois do zero na mesma sessão offline.

Testado de ponta a ponta com Playwright contra build de produção e
Supabase real, mesmo roteiro do teste de `clientes`: criar veículo
offline → ficha pendente hidrata com a placa certa → aparece na
listagem mesmo offline → volta a conexão → toast de sincronização → a
ficha de verdade (`/veiculos/{id}`) mostra o mesmo veículo, MESMO id,
com o cliente vinculado certo.

## 2026-09-23 — Offline-first: `catalogo` (terceira aplicação do padrão)

Terceira e mais simples aplicação do template — `catalog_items` não tem
FK pra outro módulo, então nenhuma das ressalvas de dependência entre
registros pendentes (como a de `veiculos` → `clientes`) se aplica aqui.
Mesmos 5 passos de sempre: `createCatalogItemRecord` extraído em
`actions.ts`, entrada `"catalogo:createCatalogItem"` em
`replay-handlers.ts`, `new-catalog-item-form.tsx`,
`(app)/catalogo/pendente/page.tsx` + `pending-catalog-items.tsx`, rota
adicionada em `PENDING_ROUTES` do `SyncProvider`. De novo, nenhuma peça
de `core/offline/` precisou mudar.

Testado de ponta a ponta com Playwright contra build de produção e
Supabase real, mesmo roteiro: criar item offline → ficha pendente
hidrata com nome/tipo/preço certos → aparece na listagem mesmo offline
→ volta a conexão → toast de sincronização → ficha de verdade
(`/catalogo/{id}`) mostra o mesmo item, MESMO id.

Com `clientes`, `veiculos` e `catalogo` prontos, só falta `ordens` —
que é o caso mais delicado por causa do número sequencial da OS (ver
ressalva no final da seção anterior de offline-first).

## 2026-09-23 — Offline-first: `ordens` (quarta e última aplicação — número sequencial)

Criar uma OS é, no fluxo já existente, só o CABEÇALHO (cliente,
veículo, km, relato, diagnóstico, desconto) — itens são adicionados
depois, numa ação separada, na página de detalhe. Isso simplifica bem
o caso "mais delicado" que ficava registrado como pendência: o suporte
offline só precisa cobrir a criação do cabeçalho, igual aos outros três
módulos; itens continuam exigindo a OS já sincronizada (com id real no
banco), então nem entram no escopo.

**A preocupação original — colisão de número sequencial entre OSs
criadas offline — na prática não existe**, porque o número nunca é
calculado nem mostrado no lado do cliente enquanto a OS está só na fila
local: `createWorkOrderRecord` (a versão sem `redirect`, chamável pelo
motor de sync — mesmo padrão dos outros três módulos) só faz o upsert
atômico em `work_order_counters` no momento do INSERT de verdade, que
só acontece quando o motor de sincronização processa aquele item da
fila. Como a fila sempre roda sequencialmente (nunca em paralelo — já
era assim desde a primeira versão do `sync-engine.ts`), cada OS pega
seu número real um de cada vez, na hora que chega a vez dela sincronizar
— o mesmo upsert atômico que já protegia contra corrida em criações
online protege igual aqui. Enquanto pendente, a ficha "provisória"
(`(app)/ordens/pendente/page.tsx`) simplesmente não mostra número
nenhum, e a listagem mostra "Nova OS" no lugar de "OS #N".

Mesmos 5 passos do template, sem surpresa: `createWorkOrderRecord`
extraído, entrada `"ordens:createWorkOrder"` em `replay-handlers.ts`,
`new-work-order-form.tsx`, `(app)/ordens/pendente/page.tsx` +
`pending-work-orders.tsx`, rota adicionada em `PENDING_ROUTES`.

Testado de ponta a ponta com Playwright contra build de produção e
Supabase real: criar OS offline (cliente e veículo já sincronizados
antes) → ficha pendente sem número, com os dados do cabeçalho → aparece
como "Nova OS" na listagem mesmo offline → volta a conexão → toast de
sincronização → ficha de verdade (`/ordens/{id}`) mostra a OS com
número sequencial real (`OS #6` no teste), status "Orçamento", MESMO id.

Com isso, os 4 módulos (`clientes`, `veiculos`, `catalogo`, `ordens`)
têm suporte a criação offline. **Fora do escopo, de propósito** (ver
`core/offline/db.ts`): editar e apagar continuam exigindo conexão —
reconciliar uma edição feita offline com o que pode ter mudado no
servidor nesse meio tempo é bem mais complexo, e não é o caso de uso
real de uma oficina de balcão único (que precisa sobretudo continuar
CADASTRANDO o dia inteiro, não editando registros antigos sem rede).

## 2026-09-23 — Leva grande de UX (Fase 1 de um pedido maior)

Pedido do usuário veio com ~10 frentes (filtros/busca padronizados,
impressão em todo módulo, preservar formulário em erro, dashboard novo,
mais cor + ações discretas nas listas, fluxo "salvar e já criar o
próximo", importar/exportar planilha, backup completo com nuvem). Óbvio
demais pra uma tacada só — dividido em fases com o usuário, começando
pela que é toda visual/comportamental, sem migração de schema nem
decisão externa pendente (nuvem, formato de exportação, etc. ficam pras
fases seguintes). Itens desta fase:

- **Botão de suporte expande ao passar o mouse** (`live-support-widget.tsx`):
  trocado o botão só-ícone por um com um `<span>` de texto começando em
  `max-w-0 opacity-0` e crescendo em `group-hover/button:max-w-40
opacity-100` (a classe `group/button` já vem do próprio componente
  `Button`). Como o botão é `fixed right-4`, crescer a largura empurra a
  borda ESQUERDA pra fora — dá a impressão de "abrir pra esquerda" sem
  nenhum cálculo de posição.
- **Botão discreto de editar/apagar nas listas** — novo componente
  `components/row-actions.tsx` (ícone de lápis linkando pra página de
  detalhe + ícone de lixeira com o mesmo dialog de confirmação de
  `ConfirmDeleteButton`, mas sem `redirectTo`: ao remover, a pessoa
  continua na lista, que só dá `router.refresh()`). Adicionado nas 4
  tabelas (`clientes`, `veiculos`, `catalogo`, `ordens` — esta última só
  com editar, OS não tem exclusão, usa cancelamento por status).
- **Mais cor, tema "oficina"**: o tema inteiro (`globals.css`) era
  cinza puro (chroma 0 em quase todo token — o "neutral" padrão do
  shadcn). Trocado `--primary` por um laranja (ferramenta/sinalização),
  sidebar por um grafite escuro em vez de cinza claro (visual de
  bancada/garagem), com o item ativo do menu em laranja sólido. Badges
  de tipo (PF/PJ, serviço/peça) e de status da OS (aprovada=azul,
  concluída=verde, entregue=violeta) ganharam cores distintas em vez de
  todo mundo cair no `variant="secondary"` cinza. Fundo/cartões do
  conteúdo continuam neutros de propósito — a cor entra só nos pontos de
  ação/destaque, não satura a tela inteira.
- **Imprimir = diálogo de impressão direto, em todo módulo**: o botão
  "Imprimir" de `ordens` já existia mas só abria a página de impressão
  numa aba nova, esperando a pessoa apertar Ctrl+P por conta própria.
  Criado `components/auto-print.tsx` (`useEffect(() => window.print())`
  ao montar) e colocado no topo de toda página `[id]/imprimir/` — agora
  o diálogo abre sozinho. Réplicas dessa rota criadas para `clientes`,
  `veiculos` e `catalogo` (só `ordens` tinha antes), cada uma com botão
  "Imprimir" na página de detalhe, mesmo padrão visual (`print:` do
  Tailwind, escondendo sidebar/topo — já configurado em
  `(app)/layout.tsx`).
- **Preservar formulário em erro de validação**: investigado antes de
  mexer — já funcionava em todos os módulos, não só em `ordens`. Todo
  formulário de criar/editar usa `useActionState` com campos NÃO
  controlados (`defaultValue`) e uma `key` que só muda quando o
  registro é salvo de verdade (`updatedAt` novo vindo do servidor) —
  numa falha de validação a `key` não muda, o React não remonta os
  campos, e o que a pessoa digitou continua lá. Confirmado com teste
  Playwright (campo de e-mail com valor inválido continua preenchido
  depois do clique em Salvar). Nada para corrigir aqui.
- **"Salvar e já ficar pronto pro próximo"**: as 4 actions de criar
  (`createCustomer`, `createVehicle`, `createCatalogItem`,
  `createWorkOrder`) agora fazem `redirect` pra
  `/<modulo>/{id}?criado=1` em vez de só `/{id}`. A página de detalhe
  lê esse `criado=1` e mostra `components/created-banner.tsx`: uma
  tarja verde confirmando o que foi salvo + um botão "Cadastrar
  outro"/"Criar outra" linkando direto pro formulário de criar de novo
  (no caso de veículo, já com `?customerId=` do mesmo cliente
  preenchido). O `?criado=1` não sobrevive a um refresh/nova visita —
  não precisa de estado nem de dispensar manualmente.

Testado visualmente com Playwright contra build de produção
(screenshots + asserções): hover do botão de suporte expandindo,
tarja de "criado com sucesso" aparecendo com o botão de atalho, valor
de campo inválido permanecendo preenchido após erro, botões de
editar/apagar aparecendo na lista.

**Pendente (fases seguintes, já combinadas com o usuário)**: filtros
e busca padronizados por coluna em todos os módulos; dashboard (Painel)
redesenhado; importar/exportar em planilha por módulo; backup completo
do sistema com opção de nuvem/local/compartilhar e exportação pra
migrar de banco (schema + dados) — as duas últimas ainda precisam de
decisões do usuário (qual serviço de nuvem, formato de exportação).

## 2026-09-23 — Fase 2: filtros, ordenação e busca padronizados

Novo `components/list-filter-bar.tsx`: um select por coluna filtrável
(`filters`, ex.: status da OS, tipo do catálogo, ano do veículo) mais um
select de ordenação (`sortOptions`, cada opção já combina coluna+direção,
ex.: `{value: "name_asc", label: "Nome (A→Z)"}`). Tudo vive na URL
(`?status=`, `?type=`, `?year=`, `?sort=`) — mesmo padrão de
`search-box.tsx` (que já existia): a página (Server Component) relê
`searchParams`, passa pra `queries.ts`, o componente cliente só edita a
URL. Um componente único configurado por módulo, em vez de UI de filtro
duplicada em cada um — é o "mesmo padrão pra todas as colunas de todos
os módulos" que foi pedido.

Cada `queries.ts` ganhou:

- Um objeto `<MODULO>_SORT_OPTIONS` (label pronta em português) + um
  `ORDER_BY` interno mapeando cada chave pra uma expressão Drizzle real
  — nunca `orderBy(sql\`${column} ${direction}\`)` com string vinda do
  client (evita SQL injection via query param).
- A função de listagem passou a aceitar um objeto de opções
  (`{search?, <filtro>?, sort?}`) em vez de só `search?: string` — os 4
  módulos ficaram com uma assinatura consistente.
- `veiculos`: filtro por ano constrói as opções a partir dos anos que
  EXISTEM de verdade na frota da oficina (`listVehicleYears()`,
  `selectDistinct`), não uma faixa fixa arbitrária.
- `ordens`: não tinha nem busca ainda — adicionada (nome do cliente,
  placa do veículo, ou número exato da OS) junto com filtro por status
  e ordenação por número/total. `WORK_ORDER_STATUS_LABELS` foi exportado
  de `work-order-status-badge.tsx` (antes só um `const` interno) pra não
  duplicar os 6 labels de status no populado do filtro.

Testado com Playwright contra build de produção: filtrar OS por
"Concluída" e catálogo por "Peça" — a URL reflete o parâmetro
(`?status=concluida`, `?type=peca`) e a tabela mostra só as linhas
certas (confirmado com screenshot).

**Pendente (fases seguintes)**: dashboard (Painel) redesenhado;
importar/exportar em planilha por módulo; backup completo (nuvem/local/
compartilhar) — as duas últimas ainda precisam de decisões do usuário.

## 2026-09-23 — Fase 3: Painel (dashboard) com dados reais

`(app)/page.tsx` era um placeholder desde o início ("os módulos
aparecerão aqui..."). Reescrito com métricas relevantes pro dia a dia de
quem administra o balcão — sem depender dos módulos `agenda`/
`financeiro` do plano original (nenhum dos dois existe ainda): tudo vem
de `ordens`, `clientes` e `veiculos`, que já existem.

- **4 cards de KPI**: OS abertas (+ quantas aguardando aprovação), OS em
  andamento, faturamento do mês, total de clientes (+ novos nos últimos
  30 dias).
- **"Faturamento do mês" sem módulo financeiro**: soma de
  `totalCents` das OS com `completedAt` dentro do mês corrente
  (`date_trunc('month', now())` no SQL) — é o valor de serviço já
  finalizado, o proxy mais direto de receita que dá pra tirar da tabela
  `work_orders` hoje. Quando o módulo financeiro existir (Fase 4 do
  plano original), substitui por `financial_entries` de verdade.
- **Barra de status das OS**: contagem por status com uma barrinha
  proporcional ao maior valor — CSS puro (`div` com `width` em %, cor
  por status reaproveitando a paleta de `work-order-status-badge.tsx`),
  sem trazer lib de gráfico pro projeto só por causa disto.
- **Lista de OS recentes** (6 últimas, por número) com link direto pra
  cada uma.
- **Atalhos de criação** (Cliente/Veículo/Orçamento) no topo — sem
  precisar navegar até o módulo primeiro.
- Cada módulo ganhou uma função `get<Modulo>DashboardSummary()` em
  `queries.ts`, exportada pelo barrel (`index.ts`) — o painel só compõe,
  nunca importa `queries.ts` de módulo diretamente (mesma regra de
  acoplamento de sempre). `WorkOrderStatusBadge` e
  `WORK_ORDER_STATUS_LABELS` também passaram a ser exportados pelo
  barrel de `ordens`, pra o painel reaproveitar em vez de duplicar as
  cores/labels de status.

Testado com Playwright contra build de produção — screenshot confirma
os 4 KPIs, a barra de status e a lista de recentes todos com dados
reais do Supabase, sem placeholder nenhum sobrando.

## 2026-09-23 — Fase 4: importar/exportar em CSV

Pedido veio como "formato de planilha", sem escolher entre CSV/XLSX —
decidido CSV (sem perguntar de novo, dava pra decidir sozinho): é o
único formato que Excel, Google Sheets, Numbers e LibreOffice abrem
nativamente sem biblioteca nenhuma, mesma filosofia de não trazer
`@tanstack/react-table` só por causa de uma feature (ver decisão de
2026-09-21). `core/csv.ts` é um parser/serializer RFC 4180 escrito à
mão (~80 linhas, com teste de ida-e-volta) — sem `papaparse`/`xlsx`.

**Padrão por módulo** (`clientes`, `veiculos`, `catalogo` têm os dois
lados; `ordens` só exporta — ver ressalva abaixo):

- `GET /<modulo>/exportar` (`route.ts`, não Server Action — precisa
  devolver um arquivo de verdade com `Content-Disposition: attachment`,
  isso um Server Action não faz) devolve todos os registros da
  organização em CSV. Colunas com o MESMO nome que a importação aceita
  de volta — um export vira modelo de import sem remapear nada.
- `POST /<modulo>/importar` (Server Action) usa o novo
  `core/csv-import.ts#importCsvRows`: processa linha por linha,
  SEQUENCIALMENTE (mesma cautela do `sync-engine.ts` offline), valida
  cada uma com o MESMO schema Zod que o formulário usa e insere via o
  `create<Entity>Record` já extraído pro replay offline (reaproveitado
  aqui — synergy não planejada, mas os dois casos precisavam da mesma
  coisa: "inserir sem redirect, com validação"). Uma linha com erro não
  trava as outras — resultado é um resumo (`N de M linhas importadas`)
  com o motivo de cada falha, mesmo espírito de "não apagar tudo, só
  mostrar o erro" já estabelecido nos formulários.
- `components/csv-import-form.tsx` (upload + resumo) e
  `components/import-export-buttons.tsx` (par de botões na listagem)
  são genéricos, um componente só pra todos os módulos.

**`veiculos` importa sem expor UUID na planilha**: a coluna
`customerId` é interna — a planilha usa `customerDocument`/
`customerName` (ambas exportadas), resolvidas de volta pro UUID por
`modules/clientes/queries.ts#findCustomerByDocumentOrName` (documento
primeiro, nome como segunda tentativa) antes de validar com
`vehicleSchema`. Linha cujo cliente não existe ainda falha com uma
mensagem clara em vez de estourar erro de FK.

**`ordens` só exporta, não importa** (decisão, não pendência): criar
uma OS de verdade envolve cliente+veículo já existentes, itens
avulsos e o número sequencial atômico — fazer isso direito via CSV
importaria a mesma complexidade relacional dos itens da OS, e o
ganho real (a pessoa raramente cadastra OS em lote, diferente de
cliente/veículo/catálogo) não compensa o risco. Exportação cobre o
caso de uso real (tirar um relatório pra contabilidade/planilha).

Testado de ponta a ponta com Playwright contra build de produção e
Supabase real: exportar clientes (CSV com acentuação/vírgula
corretos), montar um CSV novo com 2 linhas (1 válida, 1 sem nome de
propósito), importar — resultado "1 de 2 linhas importada", a linha 3
reportando "Informe o nome completo.", e o cliente válido aparecendo
na listagem depois.

## 2026-09-23 — Fase 5: backup (Web Share API + JSON estrutura+dados)

Duas decisões do usuário antes de começar:

1. **Nuvem**: usar a Web Share API do navegador em vez de integrar um
   serviço específico (Google Drive, S3, etc.) — evita precisar de
   credencial/OAuth de terceiro e cobre "nuvem, máquina ou
   compartilhar" de uma vez só (ver `components/backup-download-button.tsx`
   abaixo).
2. **Exportar pra outro banco**: "uma que crie estrutura e importe
   todos os dados sem perder nada" — decidido JSON com uma seção de
   ESTRUTURA (colunas + tipos, lidos direto do schema Drizzle via
   `getTableColumns()`, nunca hardcoded à mão — nunca desalinha do
   schema real) e uma seção de DADOS (linhas completas, tipadas,
   nenhuma perda como aconteceria arredondando pra CSV). O par
   exportar/restaurar é testável de ponta a ponta dentro do próprio
   MecanoErp (é o que a suíte de testes desta fase verificou);
   restaurar num banco diferente (MySQL etc.) vira trabalho manual de
   um DBA usando a seção de estrutura como referência — gerar
   `CREATE TABLE` de verdade pra um dialeto SQL diferente
   automaticamente seria complexo demais pra fazer com confiança sem
   trazer uma lib de migração pesada, e arriscado demais pra fingir
   que funciona sem testar em cada banco de destino.

**`core/backup.ts`** — `buildOrgBackup(organizationId, organizationName)`
exporta as 6 tabelas de negócio da organização (clientes, veículos,
catálogo, contador de numeração da OS, ordens de serviço e seus itens
— NUNCA `organizations`/`memberships`, que são da CONTA, não da
oficina) num único JSON. `restoreOrgBackup(organizationId, backup)`
reimporta: **o `organizationId` de toda linha é sempre sobrescrito
pelo da sessão de quem está restaurando, nunca pelo que estiver
gravado no arquivo** — sem isso, um arquivo de outra organização (ou
editado à mão) poderia injetar dados numa oficina que não é a dele.
Inserção via `onConflictDoNothing()` (chaveado pelo `id`, que o
backup preserva) — **idempotente de propósito**: restaurar duas
vezes, ou restaurar por cima de dados que já existem (recuperação
parcial depois de uma pane), nunca duplica nem quebra, só preenche o
que faltava. Ordem de inserção respeita FK (cliente → veículo →
catálogo → contador → OS → item da OS); `work_order_items` (sem
`organization_id` próprio) entra sem re-carimbar nada — a FK pro
`work_order_id` (já da organização certa) barra qualquer vazamento
sozinha.

**`components/backup-download-button.tsx`** — busca o JSON
(`GET /backup/exportar`), monta um `File`, e usa
`navigator.canShare({files:[file]})` quando disponível: abre o
seletor NATIVO do sistema operacional (no celular, é onde aparecem
as opções "Salvar no Drive", enviar por WhatsApp/e-mail, "Salvar nos
Arquivos", etc., conforme a especificação da Web Share API — o teste
automatizado roda em Chromium desktop headless, que não suporta essa
API, então só o caminho de fallback foi verificado de ponta a ponta;
vale conferir manualmente num celular real antes de confiar cego
nesse caminho). Sem suporte
(a maioria dos navegadores de desktop hoje), cai pra download comum
via `<a download>`. Ícone do botão (nuvem vs. download) só é decidido
depois de montar no cliente (`useEffect`), nunca direto no render —
`navigator` não existe no HTML gerado pelo servidor, ler direto ali
geraria mismatch de hidratação (mesmo cuidado já documentado em
`core/offline/`).

**Backup de sistema (`/admin/backup`)**: só o dono da plataforma, só
EXPORTA (decisão, não pendência) — reaproveita `buildOrgBackup` numa
volta por todas as organizações (`buildSystemBackup()`). Sem
restauração de sistema inteiro automatizada: cruzaria
`memberships.userId` com contas do Supabase Auth que podem não
existir mais nesse estado exato, e um erro no meio de restaurar
várias organizações de uma vez é risco grande demais pra automatizar
sem supervisão. Cada organização dentro do arquivo, isoladamente,
continua restaurável com `restoreOrgBackup` — é o caminho seguro pra
recuperar uma oficina específica a partir de um backup de sistema.

Testado de ponta a ponta com Playwright contra build de produção e
Supabase real: criar um cliente → baixar o backup (confirma que o
cliente novo está no JSON) → remover o cliente (simula perda de
dado) → confirma que sumiu da listagem → restaurar o MESMO arquivo →
resumo mostra "Clientes: 1 nova, 1 já existia" (e 0 novas nas outras
5 tabelas, confirmando a idempotência) → cliente reaparece com o
MESMO id.

## 2026-09-23 — Ajustes de feedback: hover do suporte, mais cor, seta de voltar, backup

Rodada de correções em cima das 5 fases anteriores, a partir de
feedback direto do usuário depois de usar o app:

- **Botão de suporte "grudando" aberto**: o hover-expand (Fase 1) já
  funcionava certo num mouse de verdade (confirmado de novo com
  Playwright), mas usava `group-hover/button:` puro — num celular
  (touch, sem mouse), o toque ativa o `:hover` do CSS e ele fica
  "grudado" expandido até tocar em outro lugar da tela, parecendo bug
  de "aparece sem passar o mouse". Trocado por
  `[@media(hover:hover)]:group-hover/button:...` — só expande em
  dispositivo com hover de verdade; em touch, fica sempre só o ícone
  (aí é um toque normal pra acionar, sem intermediário nenhum).
- **"Ainda tudo preto e branco"**: a Fase 1 deixou botões/sidebar/
  badges coloridos, mas a ÁREA DE CONTEÚDO (fundo, cards, cabeçalho de
  tabela) continuava neutra de propósito — na prática ficou colorido
  de mais longe, cinza de perto, que é o que o usuário via na maior
  parte da tela. Reforçado:
  - `--background` ganhou um tom quente bem sutil (não mais branco
    puro) — todo fundo de página, sem mexer na legibilidade.
  - `--border`/`--muted`/`--secondary` com mais chroma (mais visivelmente
    quentes, ainda claros).
  - **Exceção deliberada** nos dois únicos componentes gerados do
    shadcn que precisaram de ajuste pra herdar o tema (documentada nos
    próprios arquivos): `card.tsx` trocou `ring-foreground/10` (fixo,
    ignorava qualquer token) por `ring-border`; `table.tsx` ganhou
    `bg-muted/40` no `<thead>` (cabeçalho de tabela não tinha cor
    nenhuma antes).
  - Novo `components/page-icon.tsx` — selo colorido (`bg-accent`) com
    o MESMO ícone que já aparece pro módulo no menu lateral
    (`module.ts#iconName`), ao lado do `<h1>` de cada listagem
    (clientes, veículos, catálogo, ordens) — reaproveita o ícone já
    existente em vez de inventar um novo, mas dá um ponto de cor no
    topo de toda tela principal, não só no painel.
- **Seta de voltar**: novo `components/back-button.tsx` — `router.back()`
  (histórico de navegação de verdade, não um link fixo pra lista, porque
  "de onde veio" pode ser várias telas diferentes: a lista, a ficha de
  um cliente, o painel). Adicionado no topo das 8 páginas de criar/editar
  (`novo` e `[id]` dos 4 módulos), ao lado do `<h1>`.
- **Backup: reforço de que "todo o banco" é só do dono**: já estava
  correto (`/admin/backup` passa por `requireAdmin()`, `/backup` por
  `withOrg()` — nunca o contrário), mas o Route Handler de
  `/admin/backup` deixava o erro de acesso negado virar um 500 genérico
  em vez de um 403 de verdade (Route Handler não passa pela árvore de
  componentes como uma Server Action passaria) — sem vazamento de dado
  em nenhum dos dois casos, só uma resposta mais limpa agora. Nenhuma
  mudança de comportamento pro usuário comum: ele nunca via esse botão
  pra começar (só existe dentro de `/admin`, inacessível sem ser dono
  da plataforma).
