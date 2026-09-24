/**
 * Histórico de versões mostrado pra pessoa usuária (selo "vX.Y.Z" no
 * canto do menu → clique abre o que mudou). Fonte ÚNICA da versão do
 * app: `APP_VERSION` é sempre a primeira entrada daqui, e o teste em
 * `__tests__/changelog.test.ts` garante que `package.json#version` bate
 * com ela.
 *
 * Toda mudança que a pessoa perceba usando o sistema ganha uma entrada
 * NOVA no topo (nunca editar uma versão já publicada — é histórico).
 * Texto em linguagem de oficina, não de programador: o que ela vai
 * notar, não como foi feito (o "como" fica em docs/decisoes.md).
 *
 * Semver simples: correção = patch (0.8.1), algo novo = minor (0.9.0).
 */

export type ChangeType = "novo" | "melhoria" | "correcao";

export interface ChangelogEntry {
  version: string;
  /** AAAA-MM-DD */
  date: string;
  changes: { type: ChangeType; text: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.9.0",
    date: "2026-09-24",
    changes: [
      {
        type: "novo",
        text: "Avisos da equipe MecanoErp chegam na hora, sem precisar atualizar a página: aparecem no canto da tela por alguns segundos e depois ficam guardados no sininho.",
      },
      {
        type: "novo",
        text: "Dá pra apagar avisos do sininho, um por um (lixeira ao lado) ou todos de uma vez.",
      },
      {
        type: "melhoria",
        text: "Nas listas, ao passar o mouse no nome aparece um destaque colorido com um lápis, mostrando que ali você abre pra editar.",
      },
    ],
  },
  {
    version: "0.8.1",
    date: "2026-09-24",
    changes: [
      {
        type: "correcao",
        text: 'Tela "O que mudou" mais curta e fácil de fechar: seta de voltar no topo e botão Fechar embaixo.',
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-09-23",
    changes: [
      { type: "melhoria", text: "Sistema bem mais rápido pra abrir telas e trocar de módulo." },
      {
        type: "correcao",
        text: "As cores não voltam mais pro preto e branco ao atualizar a página.",
      },
      {
        type: "novo",
        text: "Notificações agora têm categoria — aviso, novidade ou dica — cada uma com seu ícone.",
      },
      {
        type: "novo",
        text: "Versão do sistema no canto do menu: clique pra ver o que mudou em cada uma.",
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-09-23",
    changes: [
      { type: "novo", text: "Backup automático todo dia, ligado por padrão." },
      {
        type: "novo",
        text: "Sino de notificações no topo: avisos e novidades enviados pela equipe do MecanoErp.",
      },
      {
        type: "novo",
        text: "Dicas (ícone de informação) nos campos que costumam gerar dúvida, como CPF/CNPJ e placa.",
      },
      { type: "novo", text: "Seta de voltar nas telas de cadastro e edição." },
      { type: "correcao", text: "Botão de fazer backup não dá mais erro ao gerar o arquivo." },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-09-23",
    changes: [
      {
        type: "novo",
        text: "Importar e exportar clientes, veículos e catálogo em planilha (CSV).",
      },
      { type: "novo", text: "Exportar ordens de serviço em planilha." },
      {
        type: "novo",
        text: "Backup completo da oficina, com opção de enviar pro Drive, WhatsApp ou e-mail no celular.",
      },
      { type: "novo", text: "Restaurar um backup — seguro rodar mais de uma vez." },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-09-23",
    changes: [
      {
        type: "novo",
        text: "Filtros e ordenação em todas as listas (ex.: só OS concluídas, só peças, veículos por ano).",
      },
      { type: "novo", text: "Busca nas ordens de serviço por cliente, placa ou número." },
      {
        type: "melhoria",
        text: "Painel com números reais: OS abertas, em andamento, faturamento do mês e últimas OS.",
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-09-23",
    changes: [
      { type: "melhoria", text: "Visual novo com as cores da oficina." },
      { type: "novo", text: "Botões de editar e apagar direto nas listas." },
      { type: "novo", text: "Imprimir ficha de cliente, veículo e item do catálogo." },
      {
        type: "melhoria",
        text: "Depois de cadastrar, atalho pra já cadastrar o próximo.",
      },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-23",
    changes: [
      {
        type: "novo",
        text: "Funciona sem internet: dá pra continuar cadastrando, e tudo sincroniza sozinho quando a conexão volta.",
      },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-09-22",
    changes: [
      { type: "novo", text: "Ordens de serviço e orçamentos, com itens, desconto e impressão." },
      { type: "novo", text: "Catálogo de serviços e peças com preço padrão." },
      { type: "novo", text: 'Botão "Chamar suporte" pra receber ajuda ao vivo na tela.' },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-09-21",
    changes: [
      { type: "novo", text: "Primeira versão: login, cadastro de clientes e de veículos." },
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;
