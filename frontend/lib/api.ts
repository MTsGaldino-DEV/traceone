/**
 * lib/api.ts — Camada de acesso a dados via Supabase
 * Módulo Controle de Medidores
 */
import { supabase } from './supabase';
import type {
  Profile,
  TipoMedidor,
  Colaborador,
  Medidor,
  ServicoReport,
  ServicoReportConferencia,
  ServicoReportAguardando,
  MedidorCompleto,
  MatchCandidato,
} from './supabase';

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw new Error(error.message);
  return data as Profile;
}

// ─── Tipos de Medidores ───────────────────────────────────────────────────────

export async function getTiposMedidores(apenasAtivos = true): Promise<TipoMedidor[]> {
  let query = supabase.from('tipos_de_medidores').select('*').order('tipo');
  if (apenasAtivos) query = query.eq('ativo', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as TipoMedidor[];
}

export async function createTipoMedidor(
  payload: Omit<TipoMedidor, 'created_at' | 'updated_at'>
): Promise<TipoMedidor> {
  const { data, error } = await supabase
    .from('tipos_de_medidores')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TipoMedidor;
}

// ─── Colaboradores ────────────────────────────────────────────────────────────

export async function getColaboradores(search?: string): Promise<Colaborador[]> {
  let query = supabase.from('colaboradores').select('*').order('nome');
  if (search) {
    query = query.or(`matricula.ilike.%${search}%,nome.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Colaborador[];
}

export async function createColaborador(
  payload: Omit<Colaborador, 'created_at' | 'updated_at'>
): Promise<Colaborador> {
  const { data, error } = await supabase
    .from('colaboradores')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Colaborador;
}

export async function updateColaborador(
  matricula: string,
  patch: Partial<Omit<Colaborador, 'matricula' | 'created_at' | 'updated_at'>>
): Promise<Colaborador> {
  const { data, error } = await supabase
    .from('colaboradores')
    .update(patch)
    .eq('matricula', matricula)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Colaborador;
}

/** Quantos medidores estão vinculados a esta matrícula (bloqueiam a exclusão). */
export async function countMedidoresDoColaborador(matricula: string): Promise<number> {
  const { count, error } = await supabase
    .from('medidores_list')
    .select('id', { count: 'exact', head: true })
    .eq('matricula', matricula);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function deleteColaborador(matricula: string): Promise<void> {
  const { error } = await supabase
    .from('colaboradores')
    .delete()
    .eq('matricula', matricula);
  if (error) {
    // 23503 = foreign_key_violation — há medidores/serviços apontando pra ele
    if (error.code === '23503') {
      throw new Error(
        'Este colaborador possui medidores ou serviços vinculados e não pode ser excluído. Marque-o como inativo.'
      );
    }
    throw new Error(error.message);
  }
}

// ─── Medidores ────────────────────────────────────────────────────────────────

export interface SortConfig {
  column: string; // display/safe name
  ascending: boolean;
}

export async function getSupervisores(): Promise<string[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('supervisor')
    .not('supervisor', 'is', null)
    .order('supervisor');
  if (error) throw new Error(error.message);
  const unique = [...new Set((data ?? []).map((d: { supervisor: string }) => d.supervisor).filter(Boolean))];
  return unique as string[];
}

export async function getMedidoresCompleto(filters?: {
  matriculas?: string[];
  supervisores?: string[];
  servicoGdis?: string;
  serial?: string;
  status?: string[];
  atribuicaoInicio?: string;
  atribuicaoFim?: string;
  conclusaoInicio?: string;
  conclusaoFim?: string;
  materialCategorias?: string[];
  diasMin?: number;
  sorts?: SortConfig[];
  page?: number;
  pageSize?: number;
}): Promise<{ data: MedidorCompleto[]; total: number }> {
  let query = supabase
    .from('vw_medidores_completo')
    .select('*', { count: 'exact' });

  if (filters?.sorts && filters.sorts.length > 0) {
    for (const sort of filters.sorts) {
      const dbCol = sort.column === 'Concluído/Pendente' ? '"Concluído/Pendente"' : sort.column;
      query = query.order(dbCol, { ascending: sort.ascending });
    }
  } else {
    query = query.order('Data', { ascending: false });
  }

  if (filters?.matriculas && filters.matriculas.length > 0) {
    query = query.in('MATRICULA', filters.matriculas);
  }
  if (filters?.supervisores && filters.supervisores.length > 0) {
    query = query.in('SUPERVISOR', filters.supervisores);
  }
  if (filters?.servicoGdis) {
    query = query.ilike('"SERVIÇO GDIS"', `%${filters.servicoGdis.trim()}%`);
  }
  if (filters?.serial) {
    const rawSerials = filters.serial.split(',').map((s) => s.trim()).filter(Boolean);
    if (rawSerials.length === 1) {
      query = query.ilike('"Serial"', `%${rawSerials[0]}%`);
    } else if (rawSerials.length > 1) {
      const orCondition = rawSerials.map((s) => `"Serial".ilike.%${s}%`).join(',');
      query = query.or(orCondition);
    }
  }
  if (filters?.status && filters.status.length > 0) {
    query = query.in('"Concluído/Pendente"', filters.status);
  }
  if (filters?.atribuicaoInicio) query = query.gte('Data', filters.atribuicaoInicio);
  if (filters?.atribuicaoFim) query = query.lte('Data', filters.atribuicaoFim);
  if (filters?.conclusaoInicio) query = query.gte('Data da conclusão', filters.conclusaoInicio);
  if (filters?.conclusaoFim) query = query.lte('Data da conclusão', filters.conclusaoFim);
  if (filters?.diasMin !== undefined) query = query.gt('"DIAS DE ATRIBUIÇÃO"', filters.diasMin);

  if (filters?.materialCategorias && filters.materialCategorias.length > 0) {
    let sapCodes: string[] = [];
    if (filters.materialCategorias.includes("TC")) {
      sapCodes = [...sapCodes, '242206', '242818', '242198'];
    }
    if (filters.materialCategorias.includes("Chave De Aferição")) {
      sapCodes = [...sapCodes, '306225'];
    }
    if (filters.materialCategorias.includes("Medidores")) {
      sapCodes = [...sapCodes, '380231', '383150', '383151', '383152', '319525', '380230', '319392', '376701', '376874', '378257', '376700', '376872', '320069', '376873', '326751', '377205', '383894', '380971', '376699', '388485', '388486'];
    }
    if (sapCodes.length > 0) {
      query = query.in('Material SAP', sapCodes);
    }
  }

  if (filters?.page && filters?.pageSize) {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as MedidorCompleto[], total: count ?? 0 };
}

// Busca todos os registros de uma filtragem, paginando em blocos de 1000
// (limite máximo do PostgREST por requisição) até esgotar os resultados.
export async function getAllMedidoresCompleto(
  filters?: Omit<Parameters<typeof getMedidoresCompleto>[0], 'page' | 'pageSize'>
): Promise<MedidorCompleto[]> {
  const all: MedidorCompleto[] = [];
  const pageSize = 1000;
  let page = 1;

  while (true) {
    const { data } = await getMedidoresCompleto({ ...filters, page, pageSize });
    all.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  return all;
}

export async function createMedidor(
  payload: Pick<Medidor, 'data' | 'material_sap' | 'serial' | 'matricula' | 'servico_campo' | 'equipe'>
): Promise<Medidor> {
  const { data, error } = await supabase
    .from('medidores_list')
    .insert({ ...payload, status: 'PENDENTE' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Medidor;
}

export async function createMedidores(
  payloads: Pick<Medidor, 'data' | 'material_sap' | 'serial' | 'matricula'>[]
): Promise<Medidor[]> {
  const rows = payloads.map((p) => ({ ...p, status: 'PENDENTE' as const }));
  const { data, error } = await supabase
    .from('medidores_list')
    .insert(rows)
    .select();
  if (error) throw new Error(error.message);
  return (data ?? []) as Medidor[];
}

export type MedidorUpdatePayload = Partial<Omit<Medidor, 'servico_gdis' | 'data_conclusao'>> & {
  servico_gdis?: string | null;
  data_conclusao?: string | null;
};

export async function updateMedidor(id: string, payload: MedidorUpdatePayload): Promise<Medidor> {
  const { data, error } = await supabase
    .from('medidores_list')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Medidor;
}

// ─── Logs de medidor ─────────────────────────────────────────────────────────

export interface MedidorLog {
  id: string;
  medidor_id: string;
  evento: string;
  descricao: string | null;
  created_at: string;
}

export async function getMedidorLogs(medidorId: string): Promise<MedidorLog[]> {
  const { data, error } = await supabase
    .from('medidor_logs')
    .select('*')
    .eq('medidor_id', medidorId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as MedidorLog[];
}

export async function deleteMedidor(id: string): Promise<void> {
  const { error } = await supabase
    .from('medidores_list')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Serviços Report ──────────────────────────────────────────────────────────

export async function importServicos(rows: Omit<ServicoReport, 'imported_at'>[]): Promise<void> {
  const { error } = await supabase
    .from('servicos_report')
    .upsert(rows, { onConflict: 'servico' });
  if (error) throw new Error(error.message);
}

export async function getServicosConferencia(
  page = 1,
  pageSize = 200
): Promise<{ data: ServicoReportConferencia[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('servicos_report')
    .select('*', { count: 'exact' })
    .eq('status_conferencia', 'PENDENTE')
    .order('imported_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { data: (data ?? []) as ServicoReportConferencia[], total: count ?? 0 };
}

export async function getServicosAguardandoVinculacao(
  page = 1,
  pageSize = 200
): Promise<{ data: ServicoReportAguardando[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('servicos_report')
    .select('*', { count: 'exact' })
    .eq('status_conferencia', 'AGUARDANDO_VINCULACAO')
    .order('imported_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { data: (data ?? []) as ServicoReportAguardando[], total: count ?? 0 };
}

export async function deleteServicoReport(servicoId: string): Promise<void> {
  const { error } = await supabase
    .from('servicos_report')
    .delete()
    .eq('servico', servicoId);
  if (error) throw new Error(error.message);
}

export async function reverterServicoPendente(servicoId: string): Promise<void> {
  const { error } = await supabase
    .from('servicos_report')
    .update({ status_conferencia: 'PENDENTE', serial_buscado: null })
    .eq('servico', servicoId);
  if (error) throw new Error(error.message);
}

export async function verificarVinculacoesPendentes(): Promise<number> {
  const { data, error } = await supabase.rpc('verificar_vinculacoes_pendentes');
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export interface VincularResult {
  ok: boolean;
  aguardando?: boolean;
  error?: string;
  serial?: string;
  matricula?: string;
  nome?: string;
}

export async function vincularServicoMedidor(
  servicoId: string,
  serial: string
): Promise<VincularResult> {
  const { data, error } = await supabase.rpc('vincular_servico_medidor', {
    p_servico_id: servicoId,
    p_serial:     serial,
  });
  if (error) throw new Error(error.message);
  return data as VincularResult;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export async function runMatchMedidores(): Promise<MatchCandidato[]> {
  const { data, error } = await supabase.rpc('match_medidores');
  if (error) throw new Error(error.message);
  return (data ?? []) as MatchCandidato[];
}

// ─── Users/Profiles (Gestão de Usuários — ADMIN, GESTOR, SUPERVISOR) ─────────

export interface UserWithEmail extends Profile {
  email: string;
}

async function authHeader(): Promise<Record<string, string>> {
  const session = await getSession();
  if (!session) throw new Error('Sessão não encontrada');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function getUsersWithEmail(): Promise<UserWithEmail[]> {
  const res = await fetch('/api/users', { headers: await authHeader() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Falha ao carregar usuários');
  return data.users as UserWithEmail[];
}

// Cria o usuário e envia um convite por email — o próprio usuário define a senha
// ao clicar no link. O admin nunca sabe/define a senha de ninguém.
export async function createUser(payload: {
  name: string;
  email: string;
  role: Profile['role'];
}): Promise<void> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Falha ao criar usuário');
}

export async function updateUserProfile(
  id: string,
  patch: { name?: string; email?: string; role?: Profile['role']; is_active?: boolean }
): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Falha ao atualizar usuário');
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Falha ao excluir usuário');
}

// Envia um email com link de redefinição de senha (usado tanto pelo "Esqueci
// minha senha" no login quanto pelo admin, na tela de Gestão de Usuários).
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-senha`,
  });
  if (error) throw new Error(error.message);
}

// Troca da própria senha: reautentica com a senha atual antes de aplicar a nova.
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Sessão inválida');

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) throw new Error('Senha atual incorreta');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

// ─── Anti-Duplicidade / Reatribuição ─────────────────────────────────────────

export interface ConflictoInfo {
  serial: string;
  medidor_list_id: string;
  matricula_atual: string;
  nome_colaborador: string;
  data_atribuicao: string;
  dias_atribuido: number;
}

export interface ReatribuicaoHistorico {
  anterior?: {
    matricula: string;
    nome: string;
    data: string;
    data_reatribuicao: string;
  };
}

export async function verificarMedidorAtribuido(serial: string): Promise<ConflictoInfo | null> {
  const { data, error } = await supabase.rpc('verificar_medidor_atribuido', { p_serial: serial });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  return { serial, ...data[0] } as ConflictoInfo;
}

export async function reatribuirMedidor(params: {
  serial: string;
  novaMatricula: string;
  sapMaterialId: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('reatribuir_medidor', {
    p_serial: params.serial,
    p_nova_matricula: params.novaMatricula,
    p_sap_material_id: params.sapMaterialId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function getMedidorReatribuicaoInfo(medidorId: string): Promise<ReatribuicaoHistorico> {
  const { data: current, error: e1 } = await supabase
    .from('medidores_list')
    .select('reatribuido_de_id')
    .eq('id', medidorId)
    .single();

  if (e1 || !current?.reatribuido_de_id) return {};

  const { data: anterior } = await supabase
    .from('medidores_list')
    .select('matricula, data, data_reatribuicao')
    .eq('id', current.reatribuido_de_id)
    .single();

  if (!anterior) return {};

  const { data: colab } = await supabase
    .from('colaboradores')
    .select('nome')
    .eq('matricula', anterior.matricula)
    .single();

  return {
    anterior: {
      matricula: anterior.matricula,
      nome: colab?.nome ?? anterior.matricula,
      data: anterior.data,
      data_reatribuicao: anterior.data_reatribuicao,
    },
  };
}

// ─── Sync Atribuições (Planilha SAP) ────────────────────────────────────────

export interface MedidorParaSync {
  id: string;
  serial: string;
  matricula: string;
  material_sap: string;
  data: string;
}

export async function getMedidoresParaSync(): Promise<MedidorParaSync[]> {
  const result: MedidorParaSync[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('medidores_list')
      .select('id,serial,matricula,material_sap,data')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    result.push(...((data ?? []) as MedidorParaSync[]));
    if ((data ?? []).length < PAGE) break;
    from += PAGE;
  }
  return result;
}

export async function syncAtribuicoes(params: {
  updates: { id: string; patch: { matricula?: string; material_sap?: string; data?: string } }[];
  deletes: string[];
}): Promise<{ updated: number; deleted: number }> {
  let updated = 0;
  let deleted = 0;

  for (const { id, patch } of params.updates) {
    const { error } = await supabase.from('medidores_list').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    updated++;
  }

  const BATCH = 100;
  for (let i = 0; i < params.deletes.length; i += BATCH) {
    const batch = params.deletes.slice(i, i + BATCH);
    const { error } = await supabase.from('medidores_list').delete().in('id', batch);
    if (error) throw new Error(error.message);
    deleted += batch.length;
  }

  return { updated, deleted };
}

// ─── Planilha PC ──────────────────────────────────────────────────────────────

/** Estado atual de um medidor, para cruzar com a Planilha PC. */
export interface MedidorParaPC {
  id: string;
  serial: string;
  status: 'PENDENTE' | 'CONCLUIDO';
  servico_gdis: string | null;
  data: string;                    // data de atribuição
  data_conclusao: string | null;
  matricula: string;
}

/** Uma vinculação a aplicar: medidor ← serviço + data de instalação. */
export interface ItemPC {
  medidor_id: string;
  serial: string;
  servico: string;
  data_fim: string;                // YYYY-MM-DD
  tipo_serv: string;
  matricula: string;
}

export interface ResultadoPC {
  servicos_criados: number;
  medidores_atualizados: number;
  servicos_conferidos: number;
}

export async function getMedidoresParaPC(): Promise<MedidorParaPC[]> {
  const result: MedidorParaPC[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('medidores_list')
      .select('id,serial,status,servico_gdis,data,data_conclusao,matricula')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    result.push(...((data ?? []) as MedidorParaPC[]));
    if ((data ?? []).length < PAGE) break;
    from += PAGE;
  }
  return result;
}

/**
 * Aplica as vinculações em lotes. O RPC cria os serviços que ainda não existem
 * em servicos_report antes de vincular, então a FK de servico_gdis é satisfeita.
 */
export async function importarPlanilhaPC(
  itens: ItemPC[],
  onProgress?: (feitos: number, total: number) => void
): Promise<ResultadoPC> {
  const total: ResultadoPC = {
    servicos_criados: 0,
    medidores_atualizados: 0,
    servicos_conferidos: 0,
  };
  const BATCH = 500;
  for (let i = 0; i < itens.length; i += BATCH) {
    const lote = itens.slice(i, i + BATCH);
    const { data, error } = await supabase.rpc('', { p_itens: lote });
    if (error) throw new Error(error.message);
    const r = data as ResultadoPC;
    total.servicos_criados += r?.servicos_criados ?? 0;
    total.medidores_atualizados += r?.medidores_atualizados ?? 0;
    total.servicos_conferidos += r?.servicos_conferidos ?? 0;
    onProgress?.(Math.min(i + BATCH, itens.length), itens.length);
  }
  return total;
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export interface DashboardMetrics {
  total: number;
  pendentes: number;
  concluidos: number;
  valorPendente: number;
  valorConcluido: number;
  valorTotal: number;
  mediaDiasPendentes: number;
  acima45dias: number;
  ranking: RankingItem[];
}

export interface RankingItem {
  matricula: string;
  nome: string;
  qtd_pendente: number;
  valor_pendente: number;
}

export interface MetricsFilters {
  matriculas?: string[];
  supervisores?: string[];
  servicoGdis?: string;
  serial?: string;
  status?: string[];
  atribuicaoInicio?: string;
  atribuicaoFim?: string;
  conclusaoInicio?: string;
  conclusaoFim?: string;
  materialCategorias?: string[];
}

export async function getMedidoresMetrics(filters?: MetricsFilters): Promise<DashboardMetrics> {
  const rows: { status: string; valor: number | null; dias: number | null; matricula: string; nome: string }[] = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    let query = supabase
      .from('vw_medidores_completo')
      .select('"Concluído/Pendente","VALOR","DIAS DE ATRIBUIÇÃO","MATRICULA","COLABORADOR"')
      .range(from, from + PAGE - 1);

    if (filters?.matriculas && filters.matriculas.length > 0) query = query.in('MATRICULA', filters.matriculas);
    if (filters?.supervisores && filters.supervisores.length > 0) query = query.in('SUPERVISOR', filters.supervisores);
    if (filters?.servicoGdis) query = query.ilike('"SERVIÇO GDIS"', `%${filters.servicoGdis.trim()}%`);
    if (filters?.serial) {
      const rawSerials = filters.serial.split(',').map(s => s.trim()).filter(Boolean);
      if (rawSerials.length === 1) query = query.ilike('"Serial"', `%${rawSerials[0]}%`);
      else if (rawSerials.length > 1) query = query.or(rawSerials.map(s => `"Serial".ilike.%${s}%`).join(','));
    }
    if (filters?.status && filters.status.length > 0) query = query.in('"Concluído/Pendente"', filters.status);
    if (filters?.atribuicaoInicio) query = query.gte('Data', filters.atribuicaoInicio);
    if (filters?.atribuicaoFim) query = query.lte('Data', filters.atribuicaoFim);
    if (filters?.conclusaoInicio) query = query.gte('Data da conclusão', filters.conclusaoInicio);
    if (filters?.conclusaoFim) query = query.lte('Data da conclusão', filters.conclusaoFim);
    if (filters?.materialCategorias && filters.materialCategorias.length > 0) {
      let sapCodes: string[] = [];
      if (filters.materialCategorias.includes("TC")) sapCodes = [...sapCodes, '242206', '242818', '242198'];
      if (filters.materialCategorias.includes("Chave De Aferição")) sapCodes = [...sapCodes, '306225'];
      if (filters.materialCategorias.includes("Medidores")) sapCodes = [...sapCodes, '380231', '383150', '383151', '383152', '319525', '380230', '319392', '376701', '376874', '378257', '376700', '376872', '320069', '376873', '326751', '377205', '383894', '380971', '376699', '388485', '388486'];
      if (sapCodes.length > 0) query = query.in('Material SAP', sapCodes);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      rows.push({
        status: (row as any)['Concluído/Pendente'] ?? '',
        valor: (row as any)['VALOR'] ?? null,
        dias: (row as any)['DIAS DE ATRIBUIÇÃO'] ?? null,
        matricula: (row as any)['MATRICULA'] ?? '',
        nome: (row as any)['COLABORADOR'] ?? '',
      });
    }
    if ((data ?? []).length < PAGE) break;
    from += PAGE;
  }

  let pendentes = 0, concluidos = 0, valorPendente = 0, valorConcluido = 0;
  let somasDiasPendentes = 0, contDiasPendentes = 0, acima45 = 0;
  const rankMap = new Map<string, { nome: string; qtd_pendente: number; valor_pendente: number }>();

  for (const r of rows) {
    const isPendente = r.status === 'PENDENTE';
    const valor = typeof r.valor === 'number' ? r.valor : 0;
    const dias = typeof r.dias === 'number' ? r.dias : 0;
    if (isPendente) {
      pendentes++;
      valorPendente += valor;
      somasDiasPendentes += dias;
      contDiasPendentes++;
      if (dias > 45) acima45++;
      if (r.matricula) {
        const entry = rankMap.get(r.matricula) ?? { nome: r.nome, qtd_pendente: 0, valor_pendente: 0 };
        entry.qtd_pendente++;
        entry.valor_pendente += valor;
        rankMap.set(r.matricula, entry);
      }
    } else {
      concluidos++;
      valorConcluido += valor;
    }
  }

  const ranking: RankingItem[] = Array.from(rankMap.entries())
    .map(([matricula, v]) => ({ matricula, ...v }))
    .sort((a, b) => b.valor_pendente - a.valor_pendente)
    .slice(0, 10);

  return {
    total: rows.length,
    pendentes,
    concluidos,
    valorPendente,
    valorConcluido,
    valorTotal: valorPendente + valorConcluido,
    mediaDiasPendentes: contDiasPendentes > 0 ? somasDiasPendentes / contDiasPendentes : 0,
    acima45dias: acima45,
    ranking,
  };
}

export interface MedidorConferencia45Dias {
  id: string;
  matricula: string;
  colaborador: string;
  servicoGdis: string | null;
  serial: string;
  dias: number;
  data: string;
}

/** Um medidor ocultado da conferência, com o rastro de quem ocultou. */
export interface MedidorConferencia45DiasOculto extends MedidorConferencia45Dias {
  ocultadoPor: string;
  ocultadoEm: string;
}

/**
 * Lista da conferência +45 dias, já sem os medidores ocultados — a exclusão
 * acontece no banco para a paginação bater com o que aparece na tela.
 */
export async function getMedidoresConferencia45Dias(
  page = 1,
  pageSize = 100,
  diasAscending = false,
  diasLimite = 45
): Promise<{ data: MedidorConferencia45Dias[]; total: number }> {
  const { data, error } = await supabase.rpc('get_conferencia_45dias', {
    p_page: page,
    p_page_size: pageSize,
    p_asc: diasAscending,
    p_dias: diasLimite,
  });
  if (error) throw new Error(error.message);
  const r = data as { data: MedidorConferencia45Dias[]; total: number } | null;
  return { data: r?.data ?? [], total: r?.total ?? 0 };
}

/** Os ocultados são compartilhados: todo mundo vê a mesma lista. */
export async function getConferencia45DiasOcultos(
  diasLimite = 45
): Promise<MedidorConferencia45DiasOculto[]> {
  const { data, error } = await supabase.rpc('get_conferencia_45dias_ocultos', {
    p_dias: diasLimite,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as MedidorConferencia45DiasOculto[];
}

export async function ocultarMedidor45Dias(medidorId: string): Promise<void> {
  const { error } = await supabase
    .from('conferencia_45dias_ocultos')
    .upsert({ medidor_id: medidorId }, { onConflict: 'medidor_id' });
  if (error) throw new Error(error.message);
}

export async function reverterOcultarMedidor45Dias(medidorId: string): Promise<void> {
  const { error } = await supabase
    .from('conferencia_45dias_ocultos')
    .delete()
    .eq('medidor_id', medidorId);
  if (error) throw new Error(error.message);
}

export async function vincularServicoGdisMedidor(id: string, servicoGdis: string | null): Promise<void> {
  const { error } = await supabase
    .from('medidores_list')
    .update({
      servico_gdis: servicoGdis,
      status: 'CONCLUIDO',
      data_conclusao: new Date().toISOString().slice(0, 10),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export interface MedidorAcima45Dias {
  matricula: string;
  colaborador: string;
  servicoGdis: string | null;
  serial: string;
  valor: number;
  dias: number;
  data: string;
}

export async function getMedidoresAcima45Dias(
  filters?: MetricsFilters,
  diasLimite = 45
): Promise<MedidorAcima45Dias[]> {
  const rows: MedidorAcima45Dias[] = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    let query = supabase
      .from('vw_medidores_completo')
      .select('"MATRICULA","COLABORADOR","SERVIÇO GDIS","Serial","VALOR","DIAS DE ATRIBUIÇÃO","Data"')
      .eq('"Concluído/Pendente"', 'PENDENTE')
      .gt('"DIAS DE ATRIBUIÇÃO"', diasLimite)
      .range(from, from + PAGE - 1);

    if (filters?.matriculas && filters.matriculas.length > 0) query = query.in('MATRICULA', filters.matriculas);
    if (filters?.supervisores && filters.supervisores.length > 0) query = query.in('SUPERVISOR', filters.supervisores);
    if (filters?.servicoGdis) query = query.ilike('"SERVIÇO GDIS"', `%${filters.servicoGdis.trim()}%`);
    if (filters?.serial) {
      const rawSerials = filters.serial.split(',').map(s => s.trim()).filter(Boolean);
      if (rawSerials.length === 1) query = query.ilike('"Serial"', `%${rawSerials[0]}%`);
      else if (rawSerials.length > 1) query = query.or(rawSerials.map(s => `"Serial".ilike.%${s}%`).join(','));
    }
    if (filters?.atribuicaoInicio) query = query.gte('Data', filters.atribuicaoInicio);
    if (filters?.atribuicaoFim) query = query.lte('Data', filters.atribuicaoFim);
    if (filters?.conclusaoInicio) query = query.gte('Data da conclusão', filters.conclusaoInicio);
    if (filters?.conclusaoFim) query = query.lte('Data da conclusão', filters.conclusaoFim);
    if (filters?.materialCategorias && filters.materialCategorias.length > 0) {
      let sapCodes: string[] = [];
      if (filters.materialCategorias.includes("TC")) sapCodes = [...sapCodes, '242206', '242818', '242198'];
      if (filters.materialCategorias.includes("Chave De Aferição")) sapCodes = [...sapCodes, '306225'];
      if (filters.materialCategorias.includes("Medidores")) sapCodes = [...sapCodes, '380231', '383150', '383151', '383152', '319525', '380230', '319392', '376701', '376874', '378257', '376700', '376872', '320069', '376873', '326751', '377205', '383894', '380971', '376699', '388485', '388486'];
      if (sapCodes.length > 0) query = query.in('Material SAP', sapCodes);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      rows.push({
        matricula: (row as any)['MATRICULA'] ?? '',
        colaborador: (row as any)['COLABORADOR'] ?? '',
        servicoGdis: (row as any)['SERVIÇO GDIS'] ?? null,
        serial: (row as any)['Serial'] ?? '',
        valor: typeof (row as any)['VALOR'] === 'number' ? (row as any)['VALOR'] : 0,
        dias: typeof (row as any)['DIAS DE ATRIBUIÇÃO'] === 'number' ? (row as any)['DIAS DE ATRIBUIÇÃO'] : 0,
        data: (row as any)['Data'] ?? '',
      });
    }
    if ((data ?? []).length < PAGE) break;
    from += PAGE;
  }

  return rows.sort((a, b) => b.dias - a.dias);
}

