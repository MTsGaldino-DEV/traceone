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

export async function getUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

async function authHeader(): Promise<Record<string, string>> {
  const session = await getSession();
  if (!session) throw new Error('Sessão não encontrada');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
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

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: await authHeader(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Falha ao excluir usuário');
}

export async function updateUserRole(
  id: string,
  patch: Partial<Pick<Profile, 'name' | 'role' | 'is_active'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
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

