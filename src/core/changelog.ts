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
    version: "0.27.0",
    date: "2026-10-07",
    changes: [
      {
        type: "correcao",
        text: "Suporte ao vivo, modo noturno: o interruptor de controle remoto na tarja da sessão e o destaque do campo em foco no espelho agora ficam visíveis.",
      },
      {
        type: "correcao",
        text: "Espelho do dono: quando a pessoa troca de aba ou minimiza o navegador, o último quadro permanece com um aviso (antes ficava branco) e a tela é renovada quando ela volta.",
      },
      {
        type: "correcao",
        text: "Espelho no celular: escolher uma opção numa lista suspensa passa a trocar o valor na tela da pessoa (o campo é identificado com exatidão, sem depender de coordenadas).",
      },
    ],
  },
  {
    version: "0.26.2",
    date: "2026-10-07",
    changes: [
      {
        type: "correcao",
        text: "Modo noturno: as listas suspensas (como a do lembrete de backup) deixaram de abrir brancas e ilegíveis.",
      },
    ],
  },
  {
    version: "0.26.1",
    date: "2026-10-07",
    changes: [
      {
        type: "correcao",
        text: '"Ativar respostas pelo Telegram" passa a funcionar em produção mesmo sem a variável NEXT_PUBLIC_SITE_URL: usa o endereço pelo qual o dono está acessando o painel.',
      },
    ],
  },
  {
    version: "0.26.0",
    date: "2026-10-07",
    changes: [
      {
        type: "novo",
        text: "Lembrete de backup: o sistema avisa o responsável, a cada 3 horas (ou no intervalo que ele escolher em Backup), para baixar um backup e não perder o que foi feito se houver uma falha. Baixar o backup zera o lembrete.",
      },
      {
        type: "correcao",
        text: "Backup mais completo e confiável. Também passam a entrar no backup os itens das ordens de serviço e o contador de numeração; e o backup automático diário e o download manual, que estavam saindo vazios, voltam a trazer os dados.",
      },
    ],
  },
  {
    version: "0.25.1",
    date: "2026-10-07",
    changes: [
      {
        type: "correcao",
        text: "No controle remoto, janelas e avisos que aparecem na tela da pessoa (como a pergunta de salvar alterações) agora aparecem no espelho do dono — antes ficavam invisíveis por causa da animação.",
      },
    ],
  },
  {
    version: "0.25.0",
    date: "2026-10-07",
    changes: [
      {
        type: "novo",
        text: "O histórico de acessos agora também aparece na ficha de cada organização (só os acessos das pessoas dela, com apagar um ou todos), além do histórico geral no painel do dono.",
      },
    ],
  },
  {
    version: "0.24.1",
    date: "2026-10-07",
    changes: [
      {
        type: "correcao",
        text: "O aviso de alterações não salvas agora também percebe mudanças em listas de opções e interruptores (antes só percebia campos de texto), inclusive quando o dono edita pelo controle remoto.",
      },
    ],
  },
  {
    version: "0.24.0",
    date: "2026-10-07",
    changes: [
      {
        type: "novo",
        text: 'Painel do dono: novo cartão "Histórico de acessos" com cada login (e-mail, organização, data e hora exatas, IP, localização aproximada e aparelho). Dá para apagar um registro ou todos.',
      },
    ],
  },
  {
    version: "0.23.0",
    date: "2026-10-07",
    changes: [
      {
        type: "novo",
        text: "Ao sair de uma tela com alterações não salvas (clicando no menu, em um link ou no botão Voltar), o sistema pergunta se você quer continuar editando, descartar e sair ou salvar. Fechar a aba ou recarregar também avisa.",
      },
    ],
  },
  {
    version: "0.22.0",
    date: "2026-10-07",
    changes: [
      {
        type: "novo",
        text: "Painel do admin: os blocos da ficha da empresa (suporte ao vivo, cobrança, usuários, módulos, histórico etc.) e o do Telegram agora começam recolhidos e abrem ao clicar no título. O suporte ao vivo já abre sozinho quando há uma conversa ou tela em andamento.",
      },
    ],
  },
  {
    version: "0.21.3",
    date: "2026-10-07",
    changes: [
      {
        type: "correcao",
        text: "No controle remoto, o dono agora recolhe/expande a caixa de conversa que aparece na tela da pessoa e a move para os lados, com botões próprios (o alvo é pequeno e o arrasto não passa pelo espelho).",
      },
    ],
  },
  {
    version: "0.21.2",
    date: "2026-10-07",
    changes: [
      {
        type: "correcao",
        text: "No controle remoto, os menus suspensos agora funcionam: tocar numa lista de opções mostra as opções para o dono escolher (a lista nativa do navegador não aparece no espelho), e menus feitos em JS passam a abrir com o clique do dono.",
      },
    ],
  },
  {
    version: "0.21.1",
    date: "2026-10-07",
    changes: [
      {
        type: "correcao",
        text: "No controle remoto pelo celular, um dedo agora rola o seu lado (a tela do dono) e dois dedos rolam a tela da pessoa — antes qualquer arrasto só rolava a tela dela.",
      },
    ],
  },
  {
    version: "0.21.0",
    date: "2026-10-07",
    changes: [
      {
        type: "novo",
        text: "No celular, dá para rolar a tela da pessoa arrastando o dedo sobre o espelho (como a roda do mouse no computador), e há botões de rolar para cima e para baixo.",
      },
      {
        type: "correcao",
        text: "No controle remoto pelo celular, o teclado só abre quando você toca num campo de texto — antes abria até ao tocar em botões e textos.",
      },
      {
        type: "correcao",
        text: 'Ao tocar num campo que já tem texto, o campo de digitação começa com esse texto: dá para apagar o que já estava escrito, e há o botão "Limpar campo".',
      },
    ],
  },
  {
    version: "0.20.2",
    date: "2026-10-07",
    changes: [
      {
        type: "correcao",
        text: "No celular em pé, os botões do suporte ao vivo (como Encerrar) não passam mais da largura da tela: a barra de controles quebra de linha e o texto longo se ajusta.",
      },
    ],
  },
  {
    version: "0.20.1",
    date: "2026-10-07",
    changes: [
      {
        type: "correcao",
        text: 'No celular, ao usar o controle remoto da tela de alguém, o teclado não aparece e some mais. Há um campo "Digitar na tela da pessoa": toque num campo na tela dela, digite ali e o texto vai para o campo (inclusive com correção automática de palavras).',
      },
      {
        type: "correcao",
        text: "Removido um aviso de erro no console causado por extensões do navegador que alteram a página antes de ela carregar.",
      },
    ],
  },
  {
    version: "0.20.0",
    date: "2026-10-07",
    changes: [
      {
        type: "novo",
        text: 'Na lista de pedidos de suporte, o responsável agora pode "Enviar mensagem" para a pessoa sem pedir a tela (a conversa abre na caixa dela), e "Encerrar" um pedido que não precisa mais.',
      },
      {
        type: "novo",
        text: 'Numa conversa por texto, dá para "Cancelar pedido de tela" se o responsável desistir de ver a tela da pessoa.',
      },
      {
        type: "melhoria",
        text: "Quando a pessoa escreve na conversa, o responsável é avisado em qualquer página do painel (som e aviso); o Telegram só é usado quando ele não está com o painel aberto.",
      },
      {
        type: "melhoria",
        text: "O painel confere sozinho se as respostas pelo Telegram estão apontando para o endereço certo e avisa quando não estão.",
      },
    ],
  },
  {
    version: "0.19.0",
    date: "2026-10-07",
    changes: [
      {
        type: "novo",
        text: "Se você pedir suporte e ninguém estiver online, o responsável pode te responder pelo próprio Telegram e a resposta aparece na sua caixa de conversa. Quando você liberar a tela, a conversa continua na mesma caixa, sem trocar de lugar.",
      },
      {
        type: "melhoria",
        text: "O tempo de espera por atendimento agora é combinado com cada oficina, em vez de ser igual para todas.",
      },
      {
        type: "correcao",
        text: "As tarefas automáticas (como o backup diário) não são mais redirecionadas para a tela de login.",
      },
    ],
  },
  {
    version: "0.18.3",
    date: "2026-10-06",
    changes: [
      {
        type: "novo",
        text: "A caixa de conversa do suporte agora pode ser redimensionada: puxe o canto superior esquerdo ou o inferior direito (ou use as setas do teclado com o canto selecionado).",
      },
      {
        type: "novo",
        text: 'Em Administração, o botão "Enviar mensagem de teste" confirma se o aviso por Telegram está funcionando e explica o que falta quando não está.',
      },
    ],
  },
  {
    version: "0.18.2",
    date: "2026-10-06",
    changes: [
      {
        type: "novo",
        text: "Quando chega uma mensagem na conversa do suporte, toca um aviso sonoro (dá para silenciar no ícone de som), o título da aba pisca se você estiver em outra aba e, com a conversa recolhida, aparece o número de mensagens não lidas.",
      },
      {
        type: "melhoria",
        text: "A caixa de conversa do suporte também pode ser arrastada para qualquer lugar da tela e recolhida.",
      },
    ],
  },
  {
    version: "0.18.1",
    date: "2026-10-06",
    changes: [
      {
        type: "correcao",
        text: 'Na tela compartilhada com o suporte, o aviso de permissão não fica mais preso no espelho depois que você clica em Permitir. O suporte também ganhou o botão "Atualizar tela" para renovar a imagem se ela parecer travada.',
      },
      {
        type: "melhoria",
        text: "A caixa de conversa com o suporte agora pode ser arrastada para qualquer lugar da tela (com o mouse, o dedo ou as setas do teclado).",
      },
    ],
  },
  {
    version: "0.18.0",
    date: "2026-10-06",
    changes: [
      {
        type: "novo",
        text: 'O "Chamar suporte" agora avisa na hora quando o suporte não está online, e o responsável pela plataforma é avisado para entrar em contato. Se houver alguém online, você vê uma contagem enquanto aguarda atendimento.',
      },
      {
        type: "novo",
        text: "Durante o atendimento, usuário e suporte conversam por uma caixa de texto ao lado da tela compartilhada.",
      },
      {
        type: "correcao",
        text: "Em oficinas com vários usuários, o pedido de suporte e o acesso à tela passaram a valer só para a pessoa que pediu ajuda — antes apareciam para todos da oficina.",
      },
    ],
  },
  {
    version: "0.17.0",
    date: "2026-10-06",
    changes: [
      {
        type: "novo",
        text: 'Em oficinas com vários usuários, a ficha da OS, do cliente e do veículo mostra "Histórico": quem criou, quem alterou por último e, na OS, quem mudou cada status e quando.',
      },
      {
        type: "melhoria",
        text: "Duas pessoas mexendo na mesma OS ao mesmo tempo não se atrapalham mais: itens e total ficam certos, e se alguém salvar os dados de uma OS que outra pessoa acabou de alterar, o sistema avisa para atualizar a página em vez de sobrescrever.",
      },
      {
        type: "correcao",
        text: "Uma OS já concluída, entregue ou cancelada não aceita mais edição nem novos itens mesmo que a tela tenha ficado aberta desde antes.",
      },
      {
        type: "correcao",
        text: "Cadastros feitos sem internet agora ficam guardados por pessoa: dois funcionários no mesmo computador não veem nem enviam os cadastros pendentes um do outro.",
      },
    ],
  },
  {
    version: "0.16.0",
    date: "2026-10-06",
    changes: [
      {
        type: "novo",
        text: 'Oficinas com o modo "vários usuários" liberado ganham a tela Equipe (menu da sua conta): o responsável adiciona pessoas, define o setor de cada uma (ex.: oficina, atendimento) e escolhe quais módulos ela pode abrir (Clientes, Veículos, Catálogo, Ordens de serviço).',
      },
      {
        type: "melhoria",
        text: "O Painel mostra só os blocos dos módulos que a pessoa pode abrir. Liberar Ordens de serviço também libera Clientes, Veículos e Catálogo, de que ela depende.",
      },
      {
        type: "melhoria",
        text: "O Backup passa a ser exclusivo do responsável pela conta. Quem é desativado na Equipe perde o acesso na hora.",
      },
    ],
  },
  {
    version: "0.15.1",
    date: "2026-10-01",
    changes: [
      {
        type: "correcao",
        text: "A ficha do cliente ganhou um cabeçalho novo: avatar com as iniciais, nome em até 2 linhas (mesmo nomes de empresa bem grandes não bagunçam mais a tela) e selos com tipo, CPF/CNPJ, telefone (toque abre o WhatsApp, ou liga se for fixo) e e-mail (toque abre o seu e-mail).",
      },
      {
        type: "melhoria",
        text: "A logo da empresa no topo do menu lateral ficou bem maior e mais fácil de ver.",
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
