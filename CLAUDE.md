@AGENTS.md

# MecanoErp

ERP para oficinas mecânicas de pequeno porte. Ver `docs/README.md` para a
documentação viva (arquitetura, decisões técnicas) e o plano original em
`/home/eduardo/.claude/plans/quero-fazer-um-erp-modular-teacup.md`.

**Regra de trabalho neste projeto**: atualizar `docs/arquitetura.md` e/ou
`docs/decisoes.md` junto de qualquer mudança relevante de código — não
deixar a documentação para o fim.

**Regra de paridade dos dois layouts (Formal e Fácil)**: TUDO que existe
num layout existe no outro — métrica do painel, ação, campo, filtro, lista,
módulo. Só muda a apresentação (Fácil: cards grandes, uma pergunta por tela,
sem tabela nem jargão). Qualquer mudança em tela, em QUALQUER projeto filho
do BaseERP, é feita nos dois layouts na mesma entrega. No painel, os dados
vêm de uma fonte única (`src/app/(app)/painel-data.ts#loadPainelData`),
usada por `page.tsx` (formal) e `inicio-facil.tsx` (Fácil): métrica nova
entra no loader e é desenhada nos dois. Toda LISTA tem busca, filtros (por tipo/status/situação e por período de cadastro) e ordenação nos dois layouts: os módulos declaram isso UMA vez em `modules/<m>/list-config.ts` (filtros, ordens, `parse…ListParams`), usado pela página formal (`ListFilterBar`) e pelo Fácil (`FacilFilters`). Telas de configuração (perfil, equipe, backup, LGPD…) usam `ModePage`/`ModeSection` (`components/facil/mode-layout.tsx`) — mesmo conteúdo, apresentação por modo. Ver docs/decisoes.md.

**Versão e histórico**: toda mudança que a pessoa usuária perceba ganha
uma entrada NOVA no topo de `src/core/changelog.ts` (texto em linguagem
de oficina, não técnica — é o que aparece no selo "vX.Y.Z" do menu) e o
`version` do `package.json` sobe junto (correção = patch, algo novo =
minor). Nunca editar uma versão já publicada. O teste
`src/core/__tests__/changelog.test.ts` falha se os dois não baterem.

Antes de mexer em roteamento, Server Actions, middleware ou qualquer API do
Next.js: este projeto está no Next.js 16, que tem breaking changes em
relação a versões anteriores (ex.: `middleware.ts` virou `proxy.ts`). Ver
`node_modules/next/dist/docs/` e `docs/decisoes.md` antes de assumir uma
API de treino desatualizada.
