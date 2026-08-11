"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Link2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  getMedidoresConferencia45Dias,
  vincularServicoGdisMedidor,
} from "../../../../lib/api";
import type { MedidorConferencia45Dias } from "../../../../lib/api";
import { Pagination } from "../../../../components/Pagination";

const PAGE_SIZE = 100;

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

// ─── Linha da tabela ──────────────────────────────────────────────────────────
interface RowProps {
  medidor: MedidorConferencia45Dias;
  onVinculado: (id: string, servicoGdis: string) => void;
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

function MedidorRow({ medidor, onVinculado, addToast }: RowProps) {
  const [servicoGdis, setServicoGdis] = useState(medidor.servicoGdis ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dataFormatada = (() => {
    try {
      return new Date(medidor.data).toLocaleDateString("pt-BR");
    } catch {
      return medidor.data;
    }
  })();

  const jaVinculado = !!medidor.servicoGdis;

  const handleVincular = useCallback(async () => {
    const s = servicoGdis.trim();
    if (!s || s === medidor.servicoGdis) return;
    setSalvando(true);
    setErro(null);
    try {
      await vincularServicoGdisMedidor(medidor.id, s);
      addToast("success", `✅ Serviço GDIS ${s} vinculado ao medidor ${medidor.serial}`);
      onVinculado(medidor.id, s);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao vincular.");
    } finally {
      setSalvando(false);
    }
  }, [servicoGdis, medidor.id, medidor.servicoGdis, medidor.serial, addToast, onVinculado]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleVincular();
    }
  };

  const diasClasse =
    medidor.dias > 90
      ? "text-red-700 bg-red-50 border-red-200"
      : medidor.dias > 60
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-slate-700 bg-slate-50 border-slate-200";

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-black rounded-md border ${diasClasse}`}>
          {medidor.dias} dias
        </span>
      </td>

      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{dataFormatada}</td>

      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-mono text-sm font-bold text-slate-800">{medidor.serial}</span>
      </td>

      <td className="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">
        {medidor.matricula || <span className="text-slate-300">—</span>}
      </td>

      <td className="px-4 py-3 text-xs text-slate-600 max-w-[180px] truncate">
        {medidor.colaborador || <span className="text-slate-300">—</span>}
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={servicoGdis}
            onChange={(e) => {
              setServicoGdis(e.target.value);
              setErro(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Nº serviço GDIS"
            className={`w-40 px-3 py-1.5 border rounded-lg text-xs font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
              erro
                ? "border-red-400 focus:ring-red-300 bg-red-50"
                : jaVinculado
                ? "border-emerald-300 bg-emerald-50 focus:ring-emerald-300"
                : "border-slate-300 focus:ring-blue-400 focus:border-blue-400"
            }`}
          />
          <button
            type="button"
            onClick={handleVincular}
            disabled={!servicoGdis.trim() || servicoGdis.trim() === medidor.servicoGdis || salvando}
            title="Vincular (ou Enter)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white text-xs font-bold rounded-lg hover:bg-[#2d5282] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
          >
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
            {salvando ? "…" : jaVinculado ? "Atualizar" : "Vincular"}
          </button>
        </div>
        {erro && (
          <div className="flex items-start gap-1.5 mt-1.5">
            <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-600 font-semibold leading-tight">{erro}</p>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Conferencia45DiasPage() {
  const [medidores, setMedidores] = useState<MedidorConferencia45Dias[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [diasAscending, setDiasAscending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toasts, addToast } = useToasts();

  const load = useCallback(async (p: number, ascending: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const { data, total } = await getMedidoresConferencia45Dias(p, PAGE_SIZE, ascending);
      setMedidores(data);
      setTotal(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, diasAscending);
  }, [page, diasAscending, load]);

  const handleToggleSort = () => {
    setDiasAscending((prev) => !prev);
    setPage(1);
  };

  const handleVinculado = useCallback((id: string, servicoGdis: string) => {
    setMedidores((prev) =>
      prev.map((m) => (m.id === id ? { ...m, servicoGdis } : m))
    );
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const reload = () => load(page, diasAscending);

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
          <h2 className="text-sm font-bold text-slate-900">Conferência de Medidores +45 dias</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Medidores pendentes há mais de 45 dias. Consulte no GDIS e informe o número do serviço.
          </p>
        </div>

        {total > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Pendentes +45 dias</p>
            <p className="text-lg font-black text-slate-900 leading-tight">{total}</p>
          </div>
        )}

        <button
          type="button"
          onClick={reload}
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

        {!loading && !error && medidores.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
            <CheckCircle2 size={32} className="text-emerald-400" />
            <p className="text-sm font-bold text-slate-600">Nenhum medidor +45 dias pendente!</p>
          </div>
        )}

        {!loading && medidores.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    <button
                      type="button"
                      onClick={handleToggleSort}
                      className="flex items-center gap-1 hover:text-slate-800 transition-colors"
                      title="Ordenar por dias de atribuição"
                    >
                      Dias
                      {diasAscending ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Data Atribuição
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Serial
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Matrícula
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Colaborador
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Serviço GDIS
                  </th>
                </tr>
              </thead>
              <tbody>
                {medidores.map((m) => (
                  <MedidorRow key={m.id} medidor={m} onVinculado={handleVinculado} addToast={addToast} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="medidores"
        />
      </div>
    </div>
  );
}
