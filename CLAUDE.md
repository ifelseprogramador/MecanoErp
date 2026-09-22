@AGENTS.md

# MecanoErp

ERP para oficinas mecânicas de pequeno porte. Ver `docs/README.md` para a
documentação viva (arquitetura, decisões técnicas) e o plano original em
`/home/eduardo/.claude/plans/quero-fazer-um-erp-modular-teacup.md`.

**Regra de trabalho neste projeto**: atualizar `docs/arquitetura.md` e/ou
`docs/decisoes.md` junto de qualquer mudança relevante de código — não
deixar a documentação para o fim.

Antes de mexer em roteamento, Server Actions, middleware ou qualquer API do
Next.js: este projeto está no Next.js 16, que tem breaking changes em
relação a versões anteriores (ex.: `middleware.ts` virou `proxy.ts`). Ver
`node_modules/next/dist/docs/` e `docs/decisoes.md` antes de assumir uma
API de treino desatualizada.
