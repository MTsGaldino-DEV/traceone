"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Unlink,
  ShieldCheck,
  Undo2,
  History,
} from "lucide-react";
import {
  getDuplicidadeMedidores,
  getDuplicidadeRevisados,
  marcarDuplicidadeRevisado,
  reverterDuplicidadeRevisado,
  desvincularDuplicidadeMedidor,
} from "../../../../lib/api";
import type {
  DuplicidadeMedidor,
  DuplicidadeRevisado,
} from "../../../../lib/api";

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastMsg {
  id: number;
  type: "success" | "error" | "info";
  text: string;
}

let toastCounter = 0;

function useToasts() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const addToast = useCallback((type: ToastMsg["type"], text: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return { toasts, addToast };
}

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

// ─── Grupo de duplicidade (um serviço, vários medidores) ──────────────────────
interface GrupoProps {
  servicoGdis: string;
  medidores: DuplicidadeMedidor[];
  onDesvinculado: (id: string) => void;
  onRevisado: (servicoGdis: string) => void;
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

function GrupoDuplicidade({ servicoGdis, medidores, onDesvinculado, onRevisado, addToast }: GrupoProps) {
  const [desvinculandoId, setDesvinculandoId] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);

  const handleDesvincular = async (medidor: DuplicidadeMedidor) => {
    if (!confirm(`Desvincular o serial ${medidor.serial} do serviço ${servicoGdis}? Ele volta para PENDENTE, sem serviço.`)) return;
    setDesvinculandoId(medidor.id);
    try {
      await desvincularDuplicidadeMedidor(medidor.id);
      addToast("info", `Serial ${medidor.serial} desvinculado do serviço ${servicoGdis}.`);
      onDesvinculado(medidor.id);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao desvincular.");
    } finally {
      setDesvinculandoId(null);
    }
  };

  const handleRevisar = async () => {
    setRevisando(true);
    try {
      await marcarDuplicidadeRevisado(servicoGdis);
      addToast("success", `Serviço ${servicoGdis} marcado como revisado.`);
      onRevisado(servicoGdis);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao marcar como revisado.");
      setRevisando(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Serviço</span>
        <span className="font-mono text-sm font-black text-slate-800">{servicoGdis}</span>
        <span className="ml-1 text-xs text-slate-400">
          {medidores.length} medidores vinculados
        </span>
        <button
          type="button"
          onClick={handleRevisar}
          disabled={revisando}
          title="Marcar este serviço como revisado — vai para o log"
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          {revisando ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
          {revisando ? "…" : "Marcar como revisado"}
        </button>
      </div>

      <table className="w-full">
        <thead>
          <tr className="bg-white border-b border-slate-100">
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Serial</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Matrícula</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Colaborador</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Status</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Data</th>
            <th className="px-3 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Ação</th>
          </tr>
        </thead>
        <tbody>
          {medidores.map((m) => (
            <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-2.5">
                <span className="font-mono text-sm font-bold text-slate-800">{m.serial}</span>
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-600 font-mono whitespace-nowrap">{m.matricula}</td>
              <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[180px] truncate">{m.colaborador}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-md border ${
                    m.status === "CONCLUIDO"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-slate-600 bg-slate-50 border-slate-200"
                  }`}
                >
                  {m.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatarData(m.data)}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleDesvincular(m)}
                  disabled={desvinculandoId === m.id}
                  title="Desvincular este medidor do serviço"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-red-600 bg-red-50 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {desvinculandoId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
                  Desvincular
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Linha do log de revisados ────────────────────────────────────────────────
interface RevisadoRowProps {
  revisado: DuplicidadeRevisado;
  onRevertido: (servicoGdis: string) => void;
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

function RevisadoRow({ revisado, onRevertido, addToast }: RevisadoRowProps) {
  const [revertendo, setRevertendo] = useState(false);

  const handleReverter = async () => {
    setRevertendo(true);
    try {
      await reverterDuplicidadeRevisado(revisado.servicoGdis);
      onRevertido(revisado.servicoGdis);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao reverter.");
      setRevertendo(false);
    }
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-mono text-sm font-bold text-slate-800">{revisado.servicoGdis}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {revisado.seriaisConflitantes.map((s) => (
            <span key={s} className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {s}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
        <span className="font-semibold">{revisado.revisadoPor}</span>
        <span className="text-slate-400 ml-1.5">{formatarData(revisado.revisadoEm)}</span>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <button
          type="button"
          onClick={handleReverter}
          disabled={revertendo}
          title="Voltar para a lista de duplicidade ativa"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-600 bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          {revertendo ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}
          Reverter
        </button>
      </td>
    </tr>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DuplicidadePage() {
  const [medidores, setMedidores] = useState<DuplicidadeMedidor[]>([]);
  const [revisados, setRevisados] = useState<DuplicidadeRevisado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toasts, addToast } = useToasts();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ativos, log] = await Promise.all([
        getDuplicidadeMedidores(),
        getDuplicidadeRevisados(),
      ]);
      setMedidores(ativos);
      setRevisados(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDesvinculado = useCallback((id: string) => {
    setMedidores((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleRevisado = useCallback(
    (servicoGdis: string) => {
      setMedidores((prev) => prev.filter((m) => m.servicoGdis !== servicoGdis));
      load();
    },
    [load]
  );

  const handleRevertido = useCallback(
    (servicoGdis: string) => {
      setRevisados((prev) => prev.filter((r) => r.servicoGdis !== servicoGdis));
      addToast("info", `Serviço ${servicoGdis} voltou para a lista de duplicidade.`);
      load();
    },
    [load, addToast]
  );

  const grupos = new Map<string, DuplicidadeMedidor[]>();
  for (const m of medidores) {
    if (!grupos.has(m.servicoGdis)) grupos.set(m.servicoGdis, []);
    grupos.get(m.servicoGdis)!.push(m);
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Toasts ── */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold pointer-events-auto transition-all ${
              t.type === "success"
                ? "bg-emerald-600 text-white"
                : t.type === "info"
                ? "bg-blue-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : t.type === "info" ? (
              <Clock size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            {t.text}
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-4 flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-900">Duplicidade de Medidores</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Serviços GDIS com mais de um medidor vinculado. Confira e desvincule o serial errado.
          </p>
        </div>

        {grupos.size > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Serviços em conflito</p>
            <p className="text-lg font-black text-slate-900 leading-tight">{grupos.size}</p>
          </div>
        )}

        <button
          type="button"
          onClick={load}
          disabled={loading}
          title="Recarregar"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Carregando…</span>
          </div>
        )}

        {error && (
          <div className="m-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold">Erro ao carregar</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        {!loading && !error && grupos.size === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
            <CheckCircle2 size={32} className="text-emerald-400" />
            <p className="text-sm font-bold text-slate-600">Nenhuma duplicidade pendente!</p>
          </div>
        )}

        {!loading && grupos.size > 0 && (
          <div className="p-4 flex flex-col gap-4">
            {Array.from(grupos.entries()).map(([servicoGdis, meds]) => (
              <GrupoDuplicidade
                key={servicoGdis}
                servicoGdis={servicoGdis}
                medidores={meds}
                onDesvinculado={handleDesvinculado}
                onRevisado={handleRevisado}
                addToast={addToast}
              />
            ))}
          </div>
        )}

        {/* ════════ SEÇÃO: REVISADOS (log) ════════ */}
        {revisados.length > 0 && (
          <section className="border-t border-slate-200">
            <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <History size={13} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Revisados</span>
              <span className="ml-1 text-xs text-slate-400">— log do que já foi conferido e considerado correto</span>
              <span className="ml-auto text-xs text-slate-400">
                {revisados.length} serviço{revisados.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Serviço
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Seriais em conflito (na revisão)
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      Revisado por
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revisados.map((r) => (
                    <RevisadoRow
                      key={r.servicoGdis}
                      revisado={r}
                      onRevertido={handleRevertido}
                      addToast={addToast}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
