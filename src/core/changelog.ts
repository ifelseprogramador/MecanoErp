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
    version: "0.15.1",
    date: "2026-10-01",
    changes: [
      {
        type: "correcao",
        text: "Na ficha do cliente, nomes muito grandes agora quebram em várias linhas em vez de desorganizar a tela e empurrar os botões.",
      },
      {
        type: "melhoria",
        text: "A logo da empresa no topo do menu lateral ficou maior e mais fácil de ver.",
      },
      {
        type: "correcao",
        text: "Corrigido o erro ao salvar logo, cores e dados da oficina em Perfil.",
      },
    ],
  },
  {
    version: "0.15.0",
    date: "2026-09-30",
    changes: [
      {
        type: "novo",
        text: 'Em Perfil › "Dados da oficina", o responsável pela conta edita o nome que aparece nos orçamentos e ordens de serviço enviados ao cliente, além de CNPJ/CPF, telefone e endereço.',
      },
    ],
  },
  {
    version: "0.14.0",
    date: "2026-09-30",
    changes: [
      {
        type: "novo",
        text: "Importar e exportar clientes por planilha ficou bem mais fácil: baixe o modelo em Excel (com instruções e listas para escolher), preencha e envie. Antes de gravar, o sistema mostra quantos estão prontos, quais já existem e o que precisa ser corrigido, linha por linha.",
      },
      {
        type: "novo",
        text: 'O botão "Planilha" na lista de clientes exporta para Excel (.xlsx) ou CSV, no mesmo formato do modelo: dá para editar e importar de volta. Arquivos CSV também continuam funcionando na importação.',
      },
      {
        type: "melhoria",
        text: "Ao importar, quem já existe (mesmo CPF/CNPJ) pode ser pulado ou atualizado, e células em branco não apagam dados já cadastrados.",
      },
    ],
  },
  {
    version: "0.13.2",
    date: "2026-09-30",
    changes: [
      {
        type: "correcao",
        text: 'A janela "Enviar ao cliente" não passa mais do tamanho da tela: em telas pequenas ela rola por dentro e os botões ficam sempre dentro da janela.',
      },
    ],
  },
  {
    version: "0.13.1",
    date: "2026-09-30",
    changes: [
      {
        type: "melhoria",
        text: 'A janela "Enviar ao cliente" ficou mais clara, com botões nas cores do WhatsApp e do Telegram.',
      },
      {
        type: "novo",
        text: "A mensagem de envio agora é editável: toque nos botões (nome do cliente, número, valor, empresa) para inserir dados, veja a prévia e salve como seu texto padrão.",
      },
      {
        type: "correcao",
        text: "O link enviado ao cliente agora sai completo também quando o endereço do site não está configurado.",
      },
    ],
  },
  {
    version: "0.13.0",
    date: "2026-09-30",
    changes: [
      {
        type: "novo",
        text: 'Botão "Enviar orçamento" / "Enviar ao cliente" na ordem de serviço: gera um link seguro e um PDF e manda por WhatsApp, e-mail ou compartilhamento do celular, com o PDF anexado.',
      },
      {
        type: "novo",
        text: "Em Perfil, opção avançada para o sistema enviar e-mails da oficina com PDF anexo.",
      },
    ],
  },
  {
    version: "0.12.0",
    date: "2026-09-30",
    changes: [
      {
        type: "novo",
        text: "Cadastro de cliente com os dados que a nota fiscal exige: razão social, inscrição estadual e municipal e endereço completo.",
      },
      {
        type: "novo",
        text: "Ao digitar o CEP, rua, bairro, cidade, UF e código IBGE são preenchidos sozinhos.",
      },
      {
        type: "melhoria",
        text: "Importar e exportar clientes em planilha agora inclui os dados fiscais e o endereço separado em colunas.",
      },
      {
        type: "correcao",
        text: "Ao errar um campo do cliente, o formulário só marca o campo errado e mantém tudo o que já estava preenchido.",
      },
    ],
  },
  {
    version: "0.11.0",
    date: "2026-09-29",
    changes: [
      {
        type: "novo",
        text: 'Em Perfil, a cor de destaque (botões) e a cor do menu lateral agora são dois controles separados, com botão "Restaurar padrão" pra cada uma e botão pra remover o logo enviado.',
      },
      {
        type: "novo",
        text: "Botão para mostrar/esconder a senha digitada, tanto no login quanto ao trocar a senha.",
      },
      {
        type: "novo",
        text: "O ícone na aba do navegador e a imagem que aparece ao compartilhar o link (ex.: no WhatsApp) agora mostram a marca do sistema.",
      },
      {
        type: "correcao",
        text: "Corrigido: ao mudar o nome de exibição em Perfil, o cabeçalho e o painel não atualizavam — mostravam sempre o nome da oficina, nunca o novo nome.",
      },
      {
        type: "correcao",
        text: "Corrigido: o menu do canto superior direito mostrava o nome de exibição em vez do e-mail — agora sempre mostra o e-mail, e o nome de exibição aparece do lado esquerdo do cabeçalho.",
      },
    ],
  },
  {
    version: "0.10.2",
    date: "2026-09-28",
    changes: [
      {
        type: "melhoria",
        text: "O cabeçalho agora mostra seu nome de exibição (definido em Perfil) em vez do e-mail.",
      },
      {
        type: "melhoria",
        text: 'Na área do administrador, "Pessoas com acesso" e o histórico voltaram a mostrar o código da conta, agora junto com o nome (antes só um dos dois aparecia).',
      },
      {
        type: "novo",
        text: 'Em Perfil, quem é dono da oficina agora tem um botão "Restaurar cor padrão" para desfazer a personalização de cor e voltar à cor original do sistema.',
      },
    ],
  },
  {
    version: "0.10.1",
    date: "2026-09-28",
    changes: [
      {
        type: "correcao",
        text: 'Na área do administrador, a lista de "Pessoas com acesso" de cada oficina e o histórico de ações mostravam um código longo (o identificador interno da conta) em vez do nome da pessoa. Agora mostram o nome de exibição — ou o e-mail, se a pessoa ainda não tiver definido um nome no Perfil.',
      },
    ],
  },
  {
    version: "0.10.0",
    date: "2026-09-28",
    changes: [
      {
        type: "novo",
        text: "Ao entrar pela primeira vez com uma senha provisória (criada pelo administrador), o sistema agora pede pra trocar a senha antes de liberar qualquer outra tela. Se alguém esquecer a senha depois, o administrador pode gerar uma nova senha provisória a qualquer momento, sem apagar nada do que já foi cadastrado.",
      },
      {
        type: "novo",
        text: "Chegou o menu Perfil (clique no seu e-mail, no canto superior direito): dá pra trocar o nome de exibição, o tema claro/escuro e a senha. Quem é dono da oficina também escolhe ali a cor e o logo que aparecem pra toda a equipe.",
      },
    ],
  },
  {
    version: "0.9.1",
    date: "2026-09-24",
    changes: [
      {
        type: "melhoria",
        text: "Todos os links do sistema agora mostram o mesmo destaque colorido ao passar o mouse, com um ícone do que o clique faz: lápis pra abrir, seta pra ir, sinal de mais pra criar e download pra baixar.",
      },
    ],
  },
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
