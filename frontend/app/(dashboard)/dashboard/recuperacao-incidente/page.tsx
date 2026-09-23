"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Check,
} from "lucide-react";
import {
  getRecuperacaoPendente,
  resolverRecuperacaoPendente,
} from "../../../../lib/api";
import type { RecuperacaoPendenteItem } from "../../../../lib/api";
import { StatusMedidor } from "../../../../components/StatusMedidor";

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

// ─── Linha ─────────────────────────────────────────────────────────────────────
interface RowProps {
  item: RecuperacaoPendenteItem;
  onResolvido: (medidorId: string) => void;
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

function RecuperacaoRow({ item, onResolvido, addToast }: RowProps) {
  const [serial, setSerial] = useState(item.candidatosSerial?.[0] ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleResolver = async () => {
    const s = serial.trim();
    if (!s) return;
    setSalvando(true);
    setErro(null);
    try {
      await resolverRecuperacaoPendente(item.medidorId, s);
      addToast("success", `Serial de ${item.matricula} corrigido para ${s}.`);
      onResolvido(item.medidorId);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao corrigir.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        {item.tipo === "AMBIGUO" ? (
          <StatusMedidor status="revisao" rotulo="AMBÍGUO" />
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-black rounded-md border text-slate-600 bg-slate-50 border-slate-200">
            SEM SERIAL
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 font-codigo whitespace-nowrap">{item.serialAtual}</td>
      <td className="px-4 py-3 text-xs text-slate-600 font-codigo whitespace-nowrap">{item.matricula}</td>
      <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">{item.colaborador}</td>
      <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate" title={item.tipoEquipamento}>
        {item.tipoEquipamento}
      </td>
      <td className="px-4 py-3 text-xs text-slate-600 font-codigo whitespace-nowrap">
        {item.servicoGdis || <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatarData(item.data)}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {item.candidatosSerial && item.candidatosSerial.length > 0 ? (
            <select
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="w-40 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-codigo font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sinal-claro"
            >
              {item.candidatosSerial.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={serial}
              onChange={(e) => {
                setSerial(e.target.value);
                setErro(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleResolver();
              }}
              placeholder="Serial correto"
              className={`w-40 px-3 py-1.5 border rounded-lg text-xs font-codigo font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                erro ? "border-red-400 focus:ring-red-300 bg-red-50" : "border-slate-300 focus:ring-sinal-claro focus:border-sinal-claro"
              }`}
            />
          )}
          <button
            type="button"
            onClick={handleResolver}
            disabled={!serial.trim() || salvando}
            title="Confirmar serial"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white text-xs font-bold rounded-lg hover:bg-[#2d5282] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
          >
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
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
export default function RecuperacaoIncidentePage() {
  const [itens, setItens] = useState<RecuperacaoPendenteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toasts, addToast } = useToasts();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItens(await getRecuperacaoPendente());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleResolvido = useCallback((medidorId: string) => {
    setItens((prev) => prev.filter((i) => i.medidorId !== medidorId));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold pointer-events-auto transition-all ${
              t.type === "success" ? "bg-emerald-600 text-white" : t.type === "info" ? "bg-sinal text-white" : "bg-red-600 text-white"
            }`}
          >
            {t.type === "success" ? <CheckCircle2 size={16} /> : t.type === "info" ? <Clock size={16} /> : <AlertTriangle size={16} />}
            {t.text}
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-4 flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-900">Recuperação de Dados</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Medidores reconstruídos após o incidente de 16/09/2026 sem serial confirmado. Corrija o serial pra cada um.
          </p>
        </div>

        {itens.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Pendentes de revisão</p>
            <p className="text-lg font-black text-slate-900 leading-tight">{itens.length}</p>
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

        {!loading && !error && itens.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
            <CheckCircle2 size={32} className="text-emerald-400" />
            <p className="text-sm font-bold text-slate-600">Nenhuma pendência de recuperação!</p>
          </div>
        )}

        {!loading && itens.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Serial atual</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Matrícula</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Colaborador</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Equipamento</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Serviço GDIS</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Data</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Corrigir</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                  <RecuperacaoRow key={i.medidorId} item={i} onResolvido={handleResolvido} addToast={addToast} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
