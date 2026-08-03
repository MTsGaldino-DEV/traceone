import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Tipos base ──────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'ALMOXARIFE' | 'GESTOR';
export type StatusMedidor = 'PENDENTE' | 'CONCLUIDO';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TipoMedidor {
  cod_sap: string;
  tipo: string;
  ligacao: 'direto' | 'indireto';
  valor: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Colaborador {
  matricula: string;
  nome: string;
  supervisor?: string;
  gc?: string;
  go?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Medidor {
  id: string;
  data: string;               // date de atribuição
  material_sap: string;       // FK tipos_de_medidores
  serial: string;
  matricula: string;          // FK colaboradores
  servico_gdis?: string;      // FK servicos_report, preenchido pelo matching
  status: StatusMedidor;
  data_conclusao?: string;
  servico_campo?: string;
  equipe?: string;
  atualizacao: string;
  created_at: string;
}

export interface ServicoReport {
  servico: string;
  matricula?: string;         // FK colaboradores
  termino: string;
  cod_serv?: string;
  tipo_serv?: string;
  imported_at: string;
}

export type StatusConferencia = 'PENDENTE' | 'CONFERIDO';

export interface ServicoReportConferencia extends ServicoReport {
  status_conferencia: StatusConferencia;
  medidor_serial_vinculado?: string | null;
  conferido_em?: string | null;
}

export interface MedidorCompleto {
  id: string;
  Data: string;
  'Material SAP': string;
  Serial: string;
  MATRICULA: string;
  COLABORADOR: string;
  SUPERVISOR?: string;
  'SERVIÇO GDIS'?: string;
  'Concluído/Pendente': StatusMedidor;
  VALOR: number;
  EQUIPAMENTO: string;
  'DIAS DE ATRIBUIÇÃO': number;
  'Data da conclusão'?: string;
  ATUALIZAÇÃO: string;
  'SERVIÇO CAMPO'?: string;
  EQUIPE?: string;
  reatribuido_de_id?: string | null;
  reatribuido_para_id?: string | null;
  data_reatribuicao?: string | null;
}

export interface MatchCandidato {
  medidor_id: string;
  candidatos: number;
}
