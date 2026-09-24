@AGENTS.md

# MecanoErp

ERP para oficinas mecânicas de pequeno porte. Ver `docs/README.md` para a
documentação viva (arquitetura, decisões técnicas) e o plano original em
`/home/eduardo/.claude/plans/quero-fazer-um-erp-modular-teacup.md`.

**Regra de trabalho neste projeto**: atualizar `docs/arquitetura.md` e/ou
`docs/decisoes.md` junto de qualquer mudança relevante de código — não
deixar a documentação para o fim.

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
