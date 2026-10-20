/**
 * lib/erros.ts — Tradução dos erros do banco para mensagens de gente.
 *
 * Todo erro que sai de lib/api.ts passa por traduzirErro(). O resultado é um
 * ErroSistema com um título curto (o nome do problema) e uma descrição que diz
 * por que aconteceu e o que fazer. `message` junta os dois, então as telas que
 * só mostram err.message já exibem a versão amigável.
 *
 * Erros levantados pelas nossas funções no banco usam códigos TOxxx (migration
 * 045): o título vem em MESSAGE e a descrição em DETAIL, prontos para mostrar.
 */
import { supabase } from './supabase';

/** Nome estável do problema, para a tela decidir o que fazer sem ler texto. */
export type CodigoErro =
  | 'SERIAL_JA_PENDENTE'
  | 'SEM_PERMISSAO'
  | 'NAO_ENCONTRADO'
  | 'CONFLITO'
  | 'DADO_INVALIDO'
  | 'DUPLICADO'
  | 'REFERENCIA_INEXISTENTE'
  | 'REGISTRO_EM_USO'
  | 'SESSAO_EXPIRADA'
  | 'SEM_CONEXAO'
  | 'TEMPO_ESGOTADO'
  | 'RECUSADO'
  | 'DESCONHECIDO';

export class ErroSistema extends Error {
  constructor(
    public readonly codigo: CodigoErro,
    public readonly titulo: string,
    public readonly descricao: string,
    /** Código original do Postgres/PostgREST, para suporte. */
    public readonly codigoOriginal?: string
  ) {
    super(descricao ? `${titulo} — ${descricao}` : titulo);
    this.name = 'ErroSistema';
  }
}

export function ehErro(err: unknown, codigo: CodigoErro): boolean {
  return err instanceof ErroSistema && err.codigo === codigo;
}

interface ErroBanco {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

/** Restrições conhecidas → título e descrição. `valor` é o que bateu (ex.: o serial). */
const RESTRICOES: Record<string, (valor?: string) => [CodigoErro, string, string]> = {
  idx_medidor_serial_pendente_unico: (v) => [
    'SERIAL_JA_PENDENTE',
    'Serial já pendente em outra linha',
    `${v ? `O serial ${v}` : 'Este serial'} já tem uma linha PENDENTE, e cada serial só pode ter uma. ` +
      'Esse bloqueio é proposital: evita o mesmo medidor pendente com duas pessoas. ' +
      'Se a outra linha está sobrando, exclua-a; se o medidor mudou de mãos, use a reatribuição.',
  ],
  servicos_report_pkey: (v) => [
    'DUPLICADO',
    'Serviço já importado',
    `${v ? `O serviço ${v}` : 'Este serviço'} já existe no sistema. Não é preciso importá-lo de novo.`,
  ],
  colaboradores_pkey: (v) => [
    'DUPLICADO',
    'Matrícula já cadastrada',
    `Já existe um colaborador com a matrícula ${v ?? 'informada'}. Edite o cadastro existente em vez de criar outro.`,
  ],
  tipos_de_medidores_pkey: (v) => [
    'DUPLICADO',
    'Material já cadastrado',
    `O código SAP ${v ?? 'informado'} já existe no catálogo de tipos de medidor.`,
  ],
  duplicidade_revisados_pkey: () => [
    'DUPLICADO',
    'Grupo já revisado',
    'Alguém marcou este grupo como revisado agora há pouco. Recarregue a tela.',
  ],
  medidores_list_servico_gdis_fkey: (v) => [
    'REFERENCIA_INEXISTENTE',
    'Serviço não encontrado',
    `O serviço ${v ?? 'informado'} não está nos relatórios importados. Confira o número ou importe o relatório desse serviço antes.`,
  ],
  medidores_list_matricula_fkey: (v) => [
    'REFERENCIA_INEXISTENTE',
    'Matrícula não cadastrada',
    `A matrícula ${v ?? 'informada'} não está no cadastro de colaboradores. Cadastre o colaborador antes.`,
  ],
  medidores_list_material_sap_fkey: (v) => [
    'REFERENCIA_INEXISTENTE',
    'Material não cadastrado',
    `O código SAP ${v ?? 'informado'} não está no catálogo de tipos de medidor.`,
  ],
  servicos_report_matricula_fkey: (v) => [
    'REFERENCIA_INEXISTENTE',
    'Matrícula não cadastrada',
    `A matrícula ${v ?? 'informada'} veio no relatório mas não está no cadastro de colaboradores.`,
  ],
};

function extrairRestricao(texto: string): string | undefined {
  return texto.match(/constraint "([^"]+)"/)?.[1];
}

/** De "Key (serial)=(ABC123) already exists." tira "ABC123". */
function extrairValor(detalhe?: string | null): string | undefined {
  return detalhe?.match(/\)=\((.*?)\)/)?.[1];
}

function traduzir(error: ErroBanco): ErroSistema {
  const code = error.code ?? '';
  const msg = error.message ?? '';
  const detalhe = error.details ?? '';

  // Nossas funções no banco: título e descrição já vêm prontos.
  if (code.startsWith('TO')) {
    const mapa: Record<string, CodigoErro> = {
      TO403: 'SEM_PERMISSAO',
      TO404: 'NAO_ENCONTRADO',
      TO409: 'CONFLITO',
      TO422: 'DADO_INVALIDO',
    };
    return new ErroSistema(mapa[code] ?? 'RECUSADO', msg, detalhe, code);
  }

  if (/failed to fetch|networkerror|fetch failed|load failed/i.test(msg)) {
    return new ErroSistema(
      'SEM_CONEXAO',
      'Sem conexão com o servidor',
      'Não foi possível falar com o banco. Confira a internet e tente de novo; nada foi gravado.',
      code
    );
  }

  // Supabase Auth (login, troca de senha)
  if (/invalid login credentials/i.test(msg)) {
    return new ErroSistema('DADO_INVALIDO', 'Login inválido', 'E-mail ou senha incorretos.', code);
  }
  if (/password should be at least/i.test(msg)) {
    return new ErroSistema('DADO_INVALIDO', 'Senha curta demais', 'A senha precisa ter pelo menos 6 caracteres.', code);
  }
  if (/should be different from the old password/i.test(msg)) {
    return new ErroSistema('DADO_INVALIDO', 'Senha repetida', 'A nova senha precisa ser diferente da atual.', code);
  }

  if (code === 'PGRST301' || code === 'PGRST303' || /jwt expired|invalid jwt/i.test(msg)) {
    return new ErroSistema(
      'SESSAO_EXPIRADA',
      'Sessão expirada',
      'Seu acesso venceu. Saia e entre de novo para continuar.',
      code
    );
  }

  if (code === '23505' || code === '23503') {
    const restricao = extrairRestricao(msg);
    const valor = extrairValor(detalhe);
    const conhecida = restricao ? RESTRICOES[restricao] : undefined;

    // Excluir algo que outra tabela ainda usa (ex.: colaborador com medidores)
    if (code === '23503' && /update or delete on table/i.test(msg)) {
      const tabelaQueUsa = msg.match(/on table "([^"]+)"\s*$/)?.[1];
      return new ErroSistema(
        'REGISTRO_EM_USO',
        'Registro em uso',
        `Não dá para excluir ou alterar: ainda há ${tabelaQueUsa === 'medidores_list' ? 'medidores' : 'registros'} ligados a ele. ` +
          'Desfaça esses vínculos antes, ou inative o cadastro em vez de excluir.',
        code
      );
    }

    if (conhecida) {
      const [codigo, titulo, descricao] = conhecida(valor);
      return new ErroSistema(codigo, titulo, descricao, code);
    }

    return code === '23505'
      ? new ErroSistema('DUPLICADO', 'Registro duplicado', `Já existe um registro com ${valor ? `o valor ${valor}` : 'esses dados'}.`, code)
      : new ErroSistema('REFERENCIA_INEXISTENTE', 'Referência inexistente', `${valor ? `O valor ${valor}` : 'Um dos valores informados'} não existe no cadastro relacionado.`, code);
  }

  if (code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new ErroSistema(
      'SEM_PERMISSAO',
      'Sem permissão',
      'Seu perfil não pode fazer esta ação. Se precisar, peça a um gestor.',
      code
    );
  }

  if (code === 'PGRST116') {
    return new ErroSistema(
      'NAO_ENCONTRADO',
      'Registro não encontrado',
      'A linha foi excluída ou alterada por outra pessoa, ou seu perfil não pode alterá-la. Recarregue a tela.',
      code
    );
  }

  if (code === '23502') {
    const coluna = msg.match(/column "([^"]+)"/)?.[1];
    return new ErroSistema('DADO_INVALIDO', 'Campo obrigatório vazio', `Preencha o campo ${coluna ?? 'obrigatório'} antes de salvar.`, code);
  }

  if (code === '23514') {
    return new ErroSistema('DADO_INVALIDO', 'Valor não permitido', 'Um dos valores informados está fora do que o sistema aceita.', code);
  }

  if (code === '22P02' || code === '22007' || code === '22008') {
    return new ErroSistema('DADO_INVALIDO', 'Formato inválido', 'Um número ou data está num formato que o sistema não entende. Confira o que foi digitado.', code);
  }

  if (code === '57014') {
    return new ErroSistema('TEMPO_ESGOTADO', 'A operação demorou demais', 'O banco cancelou por tempo. Tente com menos linhas de cada vez.', code);
  }

  // RAISE EXCEPTION das funções antigas: a mensagem já é em português.
  if (code === 'P0001') {
    return new ErroSistema('RECUSADO', 'Operação recusada', msg, code);
  }

  return new ErroSistema('DESCONHECIDO', 'Erro inesperado', msg || 'Tente de novo. Se continuar, avise o gestor.', code);
}

/**
 * Converte o erro do Supabase em ErroSistema. Recusas por permissão também vão
 * para o log de auditoria — a transação recusada não grava nada, então o
 * registro precisa ser feito à parte.
 */
export function traduzirErro(error: ErroBanco | Error, contexto?: string): ErroSistema {
  if (error instanceof ErroSistema) return error;
  const erro = traduzir(error as ErroBanco);

  if (erro.codigo === 'SEM_PERMISSAO') {
    void supabase
      .rpc('registrar_acesso_negado', {
        p_acao: contexto ?? erro.titulo,
        p_detalhe: erro.descricao,
      })
      .then(() => undefined, () => undefined);
  }

  if (contexto) {
    return new ErroSistema(erro.codigo, `${contexto}: ${erro.titulo}`, erro.descricao, erro.codigoOriginal);
  }
  return erro;
}
