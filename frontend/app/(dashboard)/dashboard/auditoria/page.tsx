"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, AlertTriangle, Search, ShieldAlert, Bot, Cog, User } from "lucide-react";
import { getAuditoria } from "../../../../lib/api";
import type { AuditoriaItem, AuditoriaFiltros } from "../../../../lib/api";
import { Pagination } from "../../../../components/Pagination";
import { canGestao, roleLabels } from "../../../../lib/permissions";
import { usePapel } from "../../../../lib/usePapel";
import type { Role } from "../../../../lib/supabase";

const PAGE_SIZE = 50;

// Rótulo e cor de cada evento gravado por fn_auditoria (migration 045).
const EVENTOS: Record<string, { rotulo: string; classe: string }> = {
  SERVICO_VINCULADO: { rotulo: "Serviço vinculado", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SERVICO_SUBSTITUIDO: { rotulo: "Serviço substituído", classe: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  SERVICO_DESVINCULADO: { rotulo: "Serviço desvinculado", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  SERIAL_SUBSTITUIDO: { rotulo: "Nº do medidor substituído", classe: "bg-sky-50 text-sky-700 border-sky-200" },
  MEDIDOR_CADASTRADO: { rotulo: "Medidor cadastrado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  MEDIDOR_EXCLUIDO: { rotulo: "Medidor excluído", classe: "bg-red-50 text-red-700 border-red-200" },
  MEDIDOR_REATRIBUIDO: { rotulo: "Medidor reatribuído", classe: "bg-violet-50 text-violet-700 border-violet-200" },
  COLABORADOR_ALTERADO: { rotulo: "Colaborador do medidor alterado", classe: "bg-violet-50 text-violet-700 border-violet-200" },
  STATUS_ALTERADO: { rotulo: "Status alterado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  MEDIDOR_EDITADO: { rotulo: "Medidor editado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  SERVICO_IMPORTADO: { rotulo: "Serviço importado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  SERVICO_EXCLUIDO: { rotulo: "Serviço excluído", classe: "bg-red-50 text-red-700 border-red-200" },
  SERVICO_EDITADO: { rotulo: "Serviço editado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  CONFERENCIA_PENDENTE: { rotulo: "Serviço voltou p/ conferência", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  CONFERENCIA_CONFERIDO: { rotulo: "Serviço conferido", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CONFERENCIA_AGUARDANDO_VINCULACAO: { rotulo: "Aguardando vinculação", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  COLABORADOR_CADASTRADO: { rotulo: "Colaborador cadastrado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  COLABORADOR_EDITADO: { rotulo: "Colaborador editado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  COLABORADOR_EXCLUIDO: { rotulo: "Colaborador excluído", classe: "bg-red-50 text-red-700 border-red-200" },
  USUARIO_CRIADO: { rotulo: "Usuário criado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  USUARIO_EDITADO: { rotulo: "Usuário editado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  USUARIO_EXCLUIDO: { rotulo: "Usuário excluído", classe: "bg-red-50 text-red-700 border-red-200" },
  PAPEL_ALTERADO: { rotulo: "Papel do usuário alterado", classe: "bg-violet-50 text-violet-700 border-violet-200" },
  TIPO_CADASTRADO: { rotulo: "Tipo de medidor cadastrado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  TIPO_EDITADO: { rotulo: "Tipo de medidor editado", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  TIPO_EXCLUIDO: { rotulo: "Tipo de medidor excluído", classe: "bg-red-50 text-red-700 border-red-200" },
  OCULTADO_45_DIAS: { rotulo: "Ocultado (+45 dias)", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  REEXIBIDO_45_DIAS: { rotulo: "Reexibido (+45 dias)", classe: "bg-slate-50 text-slate-700 border-slate-200" },
  DUPLICIDADE_REVISADA: { rotulo: "Duplicidade revisada", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REVISAO_REVERTIDA: { rotulo: "Revisão revertida", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  ACESSO_NEGADO: { rotulo: "Acesso negado", classe: "bg-red-50 text-red-700 border-red-200" },
};

const TABELAS: [string, string][] = [
  ["", "Todas as áreas"],
  ["medidores_list", "Medidores"],
  ["servicos_report", "Serviços GDIS"],
  ["colaboradores", "Colaboradores"],
  ["profiles", "Usuários"],
  ["tipos_de_medidores", "Tipos de medidor"],
  ["conferencia_45dias_ocultos", "Conferência +45 dias"],
  ["duplicidade_revisados", "Duplicidade"],
];

const CAMPOS: Record<string, string> = {
  serial: "Serial",
  servico_gdis: "Serviço",
  matricula: "Matrícula",
  status: "Status",
  data: "Atribuição",
  data_conclusao: "Conclusão",
  material_sap: "Material",
  status_conferencia: "Conferência",
  medidor_serial_vinculado: "Serial vinculado",
  serial_buscado: "Serial buscado",
  conferido_em: "Conferido em",
  reatribuido_para_id: "Reatribuído para",
  data_reatribuicao: "Data reatribuição",
  role: "Papel",
  is_active: "Ativo",
  name: "Nome",
  nome: "Nome",
  ativo: "Ativo",
};

// Campos que só poluem a leitura de uma inclusão/exclusão
const IGNORAR = new Set(["id", "created_at", "updated_at", "atualizacao", "imported_at"]);

function formatarValor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function Alteracoes({ item }: { item: AuditoriaItem }) {
  if (item.operacao === "NEGADO") {
    const d = item.depois as { acao?: string; detalhe?: string } | null;
    return (
      <div className="text-xs text-red-700 leading-snug">
        <p className="font-semibold">{d?.acao}</p>
        {d?.detalhe && <p className="text-red-600/80">{d.detalhe}</p>}
      </div>
    );
  }

  const base = item.operacao === "DELETE" ? item.antes : item.depois;
  const campos = Object.keys(base ?? {}).filter((k) => !IGNORAR.has(k));

  if (item.operacao === "UPDATE") {
    return (
      <ul className="space-y-0.5">
        {campos.map((k) => (
          <li key={k} className="text-xs text-slate-600">
            <span className="text-slate-400">{CAMPOS[k] ?? k}:</span>{" "}
            <span className="font-codigo line-through decoration-red-300 text-slate-400">{formatarValor(item.antes?.[k])}</span>
            {" → "}
            <span className="font-codigo font-semibold text-slate-800">{formatarValor(item.depois?.[k])}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-xs text-slate-500 leading-snug">
      {campos
        .filter((k) => base?.[k] !== null && base?.[k] !== undefined && base?.[k] !== "")
        .map((k) => `${CAMPOS[k] ?? k}: ${formatarValor(base?.[k])}`)
        .join(" · ")}
    </p>
  );
}

function Origem({ item }: { item: AuditoriaItem }) {
  if (item.origem === "AUTOMATICO") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title="Vinculação automática disparada pelo lançamento">
        <Bot size={12} /> automático
      </span>
    );
  }
  if (item.origem === "SISTEMA") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title="Script ou rotina sem usuário logado">
        <Cog size={12} /> sistema
      </span>
    );
  }
  return null;
}

export default function AuditoriaPage() {
  const papel = usePapel();
  const [itens, setItens] = useState<AuditoriaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [buscaInput, setBuscaInput] = useState("");
  const [filtros, setFiltros] = useState<AuditoriaFiltros>({});

  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => ({ ...f, busca: buscaInput.trim() || undefined }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [buscaInput]);

  const mudarFiltro = (patch: Partial<AuditoriaFiltros>) => {
    setFiltros((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const load = useCallback(async (p: number, f: AuditoriaFiltros) => {
    setLoading(true);
    setError(null);
    try {
      const { data, total } = await getAuditoria(f, p, PAGE_SIZE);
      setItens(data);
      setTotal(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar o log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canGestao(papel)) load(page, filtros);
  }, [papel, page, filtros, load]);

  if (papel === undefined) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-slate-400" size={20} />
      </div>
    );
  }
  if (!canGestao(papel)) return null; // o layout redireciona

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Log de auditoria</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Toda inclusão, alteração e exclusão no sistema, com quem fez e o antes/depois. Também registra
            tentativas recusadas por falta de permissão. Visível só para Gestor e Administrador.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(page, filtros)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2 bg-white border border-slate-200 rounded-xl p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            placeholder="Serial, serviço, matrícula ou usuário"
            className="w-full h-9 pl-8 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sinal-claro"
          />
        </div>
        <select
          value={filtros.tabela ?? ""}
          onChange={(e) => mudarFiltro({ tabela: e.target.value || undefined })}
          className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          {TABELAS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={filtros.evento ?? ""}
          onChange={(e) => mudarFiltro({ evento: e.target.value || undefined })}
          className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="">Todos os eventos</option>
          {Object.entries(EVENTOS).map(([v, { rotulo }]) => (
            <option key={v} value={v}>{rotulo}</option>
          ))}
        </select>
        <label className="text-xs text-slate-500 flex flex-col">
          De
          <input
            type="date"
            value={filtros.de ?? ""}
            onChange={(e) => mudarFiltro({ de: e.target.value || undefined })}
            className="h-9 px-2 text-sm border border-slate-200 rounded-lg"
          />
        </label>
        <label className="text-xs text-slate-500 flex flex-col">
          Até
          <input
            type="date"
            value={filtros.ate ?? ""}
            onChange={(e) => mudarFiltro({ ate: e.target.value || undefined })}
            className="h-9 px-2 text-sm border border-slate-200 rounded-lg"
          />
        </label>
      </div>

      {error ? (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Quando</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Quem</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Evento</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Registro</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">O que mudou</th>
                </tr>
              </thead>
              <tbody>
                {loading && itens.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center">
                      <Loader2 className="animate-spin text-slate-400 inline" size={20} />
                    </td>
                  </tr>
                ) : itens.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-sm text-slate-500">
                      Nenhum registro com esses filtros.
                    </td>
                  </tr>
                ) : (
                  itens.map((item) => {
                    const ev = EVENTOS[item.evento] ?? {
                      rotulo: item.evento,
                      classe: "bg-slate-50 text-slate-700 border-slate-200",
                    };
                    return (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                          {new Date(item.criado_em).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {item.usuario_nome ? (
                            <div className="flex items-start gap-1.5">
                              <User size={13} className="text-slate-400 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-slate-800">{item.usuario_nome}</p>
                                <p className="text-[11px] text-slate-500">
                                  {roleLabels[item.usuario_papel as Role] ?? item.usuario_papel}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          <Origem item={item} />
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md border ${ev.classe}`}>
                            {item.evento === "ACESSO_NEGADO" && <ShieldAlert size={11} />}
                            {ev.rotulo}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-codigo text-xs font-bold text-slate-800 whitespace-nowrap">
                          {item.operacao === "NEGADO" ? "—" : item.chave ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 min-w-[260px]">
                          <Alteracoes item={item} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            label="registros"
          />
        </div>
      )}
    </div>
  );
}
