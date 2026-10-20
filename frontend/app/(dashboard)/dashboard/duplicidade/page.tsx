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
  Trash2,
  Replace,
} from "lucide-react";
import {
  getDuplicidadeMedidores,
  getDuplicidadeRevisados,
  marcarDuplicidadeRevisado,
  reverterDuplicidadeRevisado,
  desvincularDuplicidadeMedidor,
  excluirMedidorDuplicado,
  substituirSerialMedidor,
  substituirServicoMedidor,
} from "../../../../lib/api";
import type {
  DuplicidadeMedidor,
  DuplicidadeRevisado,
  TipoDuplicidade,
} from "../../../../lib/api";
import { StatusMedidor } from "../../../../components/StatusMedidor";
import { ErroSistema } from "../../../../lib/erros";
import { canVincularServico } from "../../../../lib/permissions";
import { usePapel } from "../../../../lib/usePapel";

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
    // erro fica mais tempo: a descrição explica o que fazer
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), type === "error" ? 9000 : 4000);
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

/** Identidade do grupo na tela — o mesmo par que chaveia duplicidade_revisados. */
function chaveGrupo(tipo: TipoDuplicidade, chave: string) {
  return `${tipo}|${chave}`;
}

const ETIQUETA: Record<TipoDuplicidade, { rotulo: string; campo: string; classe: string }> = {
  SERVICO: {
    rotulo: "Serviço duplicado",
    campo: "Serviço",
    classe: "bg-amber-50 text-amber-700 border-amber-200",
  },
  SERIAL: {
    rotulo: "Medidor duplicado",
    campo: "Serial",
    classe: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

// ─── Grupo de duplicidade ─────────────────────────────────────────────────────
interface GrupoProps {
  tipo: TipoDuplicidade;
  chave: string;
  medidores: DuplicidadeMedidor[];
  onLinhaAlterada: () => void;
  onRevisado: (tipo: TipoDuplicidade, chave: string) => void;
  addToast: (type: "success" | "error" | "info", text: string) => void;
  podeVincular: boolean;
}

type CampoSubstituir = "serial" | "servico";

function GrupoDuplicidade({ tipo, chave, medidores, onLinhaAlterada, onRevisado, addToast, podeVincular }: GrupoProps) {
  const [substituindo, setSubstituindo] = useState<{ medidor: DuplicidadeMedidor; campo: CampoSubstituir } | null>(null);
  const [desvinculandoId, setDesvinculandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
  const etiqueta = ETIQUETA[tipo];

  const handleDesvincular = async (medidor: DuplicidadeMedidor) => {
    const doServico = medidor.servicoGdis ? `do serviço ${medidor.servicoGdis}` : "(já está sem serviço)";
    if (!confirm(`Desvincular o serial ${medidor.serial} ${doServico}? Ele volta para PENDENTE, sem serviço.`)) return;
    setDesvinculandoId(medidor.id);
    try {
      await desvincularDuplicidadeMedidor(medidor.id);
      addToast("info", `Serial ${medidor.serial} desvinculado.`);
      onLinhaAlterada();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao desvincular.");
    } finally {
      setDesvinculandoId(null);
    }
  };

  const handleExcluir = async (medidor: DuplicidadeMedidor) => {
    const servico = medidor.servicoGdis ? `serviço ${medidor.servicoGdis}` : "sem serviço";
    if (
      !confirm(
        `EXCLUIR esta linha do serial ${medidor.serial} (${servico}, ${medidor.matricula})?\n\n` +
          `A linha e o histórico dela são apagados e não voltam. ` +
          `As outras linhas com esse serial continuam.\n\n` +
          `Confira antes se é esta a linha errada — elas costumam ter data e responsável diferentes.`
      )
    )
      return;
    setExcluindoId(medidor.id);
    try {
      const restantes = await excluirMedidorDuplicado(medidor.id);
      addToast("success", `Linha excluída. Sobrou${restantes !== 1 ? "ram" : ""} ${restantes} com o serial ${medidor.serial}.`);
      onLinhaAlterada();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setExcluindoId(null);
    }
  };

  const handleRevisar = async () => {
    setRevisando(true);
    try {
      await marcarDuplicidadeRevisado(tipo, chave);
      addToast("success", `${etiqueta.campo} ${chave} marcado como revisado.`);
      onRevisado(tipo, chave);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao marcar como revisado.");
      setRevisando(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap">
        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${etiqueta.classe}`}>
          {etiqueta.rotulo}
        </span>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{etiqueta.campo}</span>
        <span className="font-codigo text-sm font-black text-slate-800">{chave}</span>
        <span className="ml-1 text-xs text-slate-400">
          {tipo === "SERVICO"
            ? `${medidores.length} medidores vinculados`
            : `${medidores.length} linhas com esse serial`}
        </span>
        <button
          type="button"
          onClick={handleRevisar}
          disabled={revisando}
          title="Marcar este grupo como revisado — vai para o log"
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
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Serviço</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Matrícula</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Colaborador</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Status</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Atribuição</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Conclusão</th>
            <th className="px-3 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Ações</th>
          </tr>
        </thead>
        <tbody>
          {medidores.map((m) => {
            // O banco só aceita uma linha PENDENTE por serial: se outra do grupo já
            // está pendente, desvincular esta bateria no índice único.
            const outraPendente = medidores.some(
              (o) => o.id !== m.id && o.serial === m.serial && o.status === "PENDENTE"
            );
            return (
            <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-2.5">
                <span className="font-codigo text-sm font-bold text-slate-800">{m.serial}</span>
              </td>
              <td className="px-4 py-2.5 font-codigo text-xs text-slate-600 whitespace-nowrap">
                {m.servicoGdis ?? <span className="text-slate-300 font-sans">—</span>}
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-600 font-codigo whitespace-nowrap">{m.matricula}</td>
              <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[180px] truncate">{m.colaborador}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <StatusMedidor
                  status={m.status === "CONCLUIDO" ? "concluido" : "pendente"}
                  rotulo={m.status}
                />
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatarData(m.data)}</td>
              <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                {m.dataConclusao ? (
                  // Conclusão antes da atribuição é impossível — sinaliza a linha suspeita.
                  <span
                    className={
                      m.dataConclusao < m.data ? "text-red-600 font-bold" : "text-slate-500"
                    }
                    title={m.dataConclusao < m.data ? "Concluído antes de ser atribuído — data inconsistente" : undefined}
                  >
                    {formatarData(m.dataConclusao)}
                    {m.dataConclusao < m.data && " ⚠"}
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubstituindo({ medidor: m, campo: "serial" })}
                    disabled={desvinculandoId === m.id || excluindoId === m.id}
                    title="Substituir o número do medidor (serial) desta linha"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-sky-700 bg-sky-50 border border-sky-200 text-xs font-bold rounded-lg hover:bg-sky-100 transition-colors disabled:opacity-50"
                  >
                    <Replace size={13} />
                    Nº medidor
                  </button>
                  {podeVincular && (
                    <button
                      type="button"
                      onClick={() => setSubstituindo({ medidor: m, campo: "servico" })}
                      disabled={desvinculandoId === m.id || excluindoId === m.id}
                      title="Substituir o número do serviço GDIS desta linha"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-indigo-700 bg-indigo-50 border border-indigo-200 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      <Replace size={13} />
                      Nº serviço
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDesvincular(m)}
                    disabled={desvinculandoId === m.id || excluindoId === m.id || outraPendente}
                    title={
                      outraPendente
                        ? "Outra linha deste serial já está PENDENTE — exclua a linha sobrando em vez de desvincular"
                        : "Desvincular do serviço — a linha continua, volta para PENDENTE"
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-amber-700 bg-amber-50 border border-amber-200 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    {desvinculandoId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
                    Desvincular
                  </button>
                  {tipo === "SERIAL" && (
                    <button
                      type="button"
                      onClick={() => handleExcluir(m)}
                      disabled={desvinculandoId === m.id || excluindoId === m.id}
                      title="Excluir esta linha de vez — o histórico dela vai junto"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-red-600 bg-red-50 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {excluindoId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Excluir linha
                    </button>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>

      {substituindo && (
        <ModalSubstituir
          medidor={substituindo.medidor}
          campo={substituindo.campo}
          onFechar={() => setSubstituindo(null)}
          onSalvo={(novo) => {
            const { medidor, campo } = substituindo;
            setSubstituindo(null);
            addToast(
              "success",
              campo === "serial"
                ? `Medidor ${medidor.serial} agora é ${novo}.`
                : `Serial ${medidor.serial} agora está no serviço ${novo}.`
            );
            onLinhaAlterada();
          }}
        />
      )}
    </div>
  );
}

// ─── Modal: substituir nº do medidor ou do serviço ───────────────────────────
interface ModalSubstituirProps {
  medidor: DuplicidadeMedidor;
  campo: CampoSubstituir;
  onFechar: () => void;
  onSalvo: (novo: string) => void;
}

function ModalSubstituir({ medidor, campo, onFechar, onSalvo }: ModalSubstituirProps) {
  const atual = campo === "serial" ? medidor.serial : medidor.servicoGdis ?? "";
  const [valor, setValor] = useState(atual);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<{ titulo: string; descricao: string } | null>(null);

  const novo = valor.trim();
  const podeSalvar = !!novo && novo !== atual && !salvando;

  const salvar = async () => {
    if (!podeSalvar) return;
    setSalvando(true);
    setErro(null);
    try {
      if (campo === "serial") await substituirSerialMedidor(medidor.id, novo);
      else await substituirServicoMedidor(medidor.id, novo);
      onSalvo(novo);
    } catch (err) {
      setErro(
        err instanceof ErroSistema
          ? { titulo: err.titulo, descricao: err.descricao }
          : { titulo: "Erro ao salvar", descricao: err instanceof Error ? err.message : "" }
      );
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onFechar}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {campo === "serial" ? "Substituir número do medidor" : "Substituir número do serviço"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {campo === "serial"
                ? `Linha de ${medidor.colaborador || medidor.matricula}`
                : `Serial ${medidor.serial} · ${medidor.colaborador || medidor.matricula}`}
            </p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Atual</label>
            <p className="font-codigo text-sm font-bold text-slate-700">
              {atual || <span className="text-slate-300 font-sans font-normal">sem serviço</span>}
            </p>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              {campo === "serial" ? "Novo número do medidor" : "Novo número do serviço GDIS"}
            </label>
            <input
              autoFocus
              type="text"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                setErro(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              className="w-full h-9 px-3 text-sm font-codigo font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sinal-claro"
            />
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            {campo === "serial"
              ? "Corrige o número desta linha. O serviço vinculado, se houver, passa a apontar para o número novo."
              : "Se a linha estiver PENDENTE, ela vira CONCLUÍDA. O serviço antigo, se ficar sem medidor, volta para a Conferência."}
          </p>

          {erro && (
            <div className="flex items-start gap-2 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-700">{erro.titulo}</p>
                {erro.descricao && <p className="text-red-600 mt-0.5 leading-snug">{erro.descricao}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onFechar}
            className="px-3 py-2 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={!podeSalvar}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1e3a5f] text-white text-xs font-bold rounded-lg hover:bg-[#2d5282] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {salvando && <Loader2 size={13} className="animate-spin" />}
            Substituir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Linha do log de revisados ────────────────────────────────────────────────
interface RevisadoRowProps {
  revisado: DuplicidadeRevisado;
  onRevertido: (tipo: TipoDuplicidade, chave: string) => void;
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

function RevisadoRow({ revisado, onRevertido, addToast }: RevisadoRowProps) {
  const [revertendo, setRevertendo] = useState(false);
  const etiqueta = ETIQUETA[revisado.tipo];

  const handleReverter = async () => {
    setRevertendo(true);
    try {
      await reverterDuplicidadeRevisado(revisado.tipo, revisado.chave);
      onRevertido(revisado.tipo, revisado.chave);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao reverter.");
      setRevertendo(false);
    }
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${etiqueta.classe}`}>
          {etiqueta.rotulo}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-codigo text-sm font-bold text-slate-800">{revisado.chave}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {revisado.itensConflitantes.map((s) => (
            <span key={s} className="font-codigo text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
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
  const podeVincular = canVincularServico(usePapel());
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

  // Recarrega em vez de filtrar local: desvincular não desfaz uma duplicidade
  // por serial (o serial segue repetido), e excluir pode encerrar o grupo. Só
  // o servidor sabe o que ainda é conflito.
  const handleLinhaAlterada = useCallback(() => {
    load();
  }, [load]);

  const handleRevisado = useCallback(
    (tipo: TipoDuplicidade, chave: string) => {
      setMedidores((prev) => prev.filter((m) => !(m.tipo === tipo && m.chave === chave)));
      load();
    },
    [load]
  );

  const handleRevertido = useCallback(
    (tipo: TipoDuplicidade, chave: string) => {
      setRevisados((prev) => prev.filter((r) => !(r.tipo === tipo && r.chave === chave)));
      addToast("info", `${ETIQUETA[tipo].campo} ${chave} voltou para a lista de duplicidade.`);
      load();
    },
    [load, addToast]
  );

  // Um grupo por (tipo, chave): a mesma linha pode cair nos dois critérios e
  // aparecer duas vezes — são problemas diferentes, com correções diferentes.
  const grupos = new Map<string, { tipo: TipoDuplicidade; chave: string; medidores: DuplicidadeMedidor[] }>();
  for (const m of medidores) {
    const k = chaveGrupo(m.tipo, m.chave);
    if (!grupos.has(k)) grupos.set(k, { tipo: m.tipo, chave: m.chave, medidores: [] });
    grupos.get(k)!.medidores.push(m);
  }

  const qtdServico = Array.from(grupos.values()).filter((g) => g.tipo === "SERVICO").length;
  const qtdSerial = Array.from(grupos.values()).filter((g) => g.tipo === "SERIAL").length;

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
                ? "bg-sinal text-white"
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
            Serviço com mais de um medidor, ou o mesmo medidor em mais de uma linha. TC e chave de
            aferição ficam de fora.
          </p>
        </div>

        {grupos.size > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Grupos em conflito</p>
            <p className="text-lg font-black text-slate-900 leading-tight">{grupos.size}</p>
            <p className="text-[11px] text-slate-400">
              {qtdSerial} por medidor · {qtdServico} por serviço
            </p>
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
            {Array.from(grupos.entries()).map(([k, g]) => (
              <GrupoDuplicidade
                key={k}
                tipo={g.tipo}
                chave={g.chave}
                medidores={g.medidores}
                onLinhaAlterada={handleLinhaAlterada}
                onRevisado={handleRevisado}
                addToast={addToast}
                podeVincular={podeVincular}
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
                {revisados.length} grupo{revisados.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Motivo
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Chave
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Em conflito (na revisão)
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
                      key={chaveGrupo(r.tipo, r.chave)}
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
