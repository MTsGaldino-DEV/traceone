"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Trash2,
  Pencil,
  Loader2,
  ShieldAlert,
  X,
  Search,
  AlertTriangle,
} from "lucide-react";
import {
  getProfile,
  getColaboradores,
  createColaborador,
  updateColaborador,
  deleteColaborador,
  countMedidoresDoColaborador,
} from "../../../../lib/api";
import type { Colaborador, Profile } from "../../../../lib/supabase";
import { canManageColaboradores } from "../../../../lib/permissions";
import { Pagination } from "../../../../components/Pagination";
import { MultiSelectSearch } from "../../../../components/MultiSelectSearch";

const PAGE_SIZE = 25;

/** Campos editáveis de um colaborador (matrícula é PK e não muda). */
interface ColabForm {
  nome: string;
  supervisor: string;
  gc: string;
  go: string;
}

const emptyForm: ColabForm = { nome: "", supervisor: "", gc: "", go: "" };

const inputClass =
  "w-full h-9 px-3 text-sm border border-linha rounded-lg focus:outline-none focus:ring-1 focus:ring-sinal-claro";

export default function ColaboradoresPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Busca + filtros
  const [search, setSearch] = useState("");
  const [fSupervisor, setFSupervisor] = useState<string[]>([]);
  const [fGc, setFGc] = useState<string[]>([]);
  const [fGo, setFGo] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Cadastro
  const [showForm, setShowForm] = useState(false);
  const [newMatricula, setNewMatricula] = useState("");
  const [newForm, setNewForm] = useState<ColabForm>(emptyForm);
  const [creating, setCreating] = useState(false);

  // Edição
  const [editTarget, setEditTarget] = useState<Colaborador | null>(null);
  const [editForm, setEditForm] = useState<ColabForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [vinculados, setVinculados] = useState<number | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadColaboradores = () => {
    setLoading(true);
    getColaboradores()
      .then(setColaboradores)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar colaboradores."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      if (!canManageColaboradores(p?.role)) {
        router.replace("/dashboard");
        return;
      }
      loadColaboradores();
    });
  }, [router]);

  // Opções dos filtros e sugestões dos formulários, tiradas do próprio cadastro
  const opcoes = useMemo(() => {
    const pick = (key: "supervisor" | "gc" | "go") =>
      [...new Set(colaboradores.map((c) => c[key]).filter(Boolean) as string[])].sort();
    return { supervisor: pick("supervisor"), gc: pick("gc"), go: pick("go") };
  }, [colaboradores]);

  const filtered = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return colaboradores.filter((c) => {
      if (fSupervisor.length && !fSupervisor.includes(c.supervisor ?? "")) return false;
      if (fGc.length && !fGc.includes(c.gc ?? "")) return false;
      if (fGo.length && !fGo.includes(c.go ?? "")) return false;
      if (!termo) return true;
      return [c.matricula, c.nome, c.supervisor, c.gc, c.go]
        .filter(Boolean)
        .some((campo) => (campo as string).toLowerCase().includes(termo));
    });
  }, [colaboradores, search, fSupervisor, fGc, fGo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const visible = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const temFiltro = search !== "" || fSupervisor.length > 0 || fGc.length > 0 || fGo.length > 0;

  const limparFiltros = () => {
    setSearch("");
    setFSupervisor([]);
    setFGc([]);
    setFGo([]);
    setPage(1);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await createColaborador({
        matricula: newMatricula.trim().toLowerCase(),
        nome: newForm.nome.trim(),
        supervisor: newForm.supervisor.trim() || undefined,
        gc: newForm.gc.trim() || undefined,
        go: newForm.go.trim() || undefined,
        ativo: true,
      });
      setShowForm(false);
      setNewMatricula("");
      setNewForm(emptyForm);
      loadColaboradores();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar colaborador.";
      setError(
        msg.includes("duplicate key")
          ? `Já existe um colaborador com a matrícula "${newMatricula.trim().toLowerCase()}".`
          : msg
      );
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (c: Colaborador) => {
    setEditTarget(c);
    setEditForm({
      nome: c.nome,
      supervisor: c.supervisor ?? "",
      gc: c.gc ?? "",
      go: c.go ?? "",
    });
    setModalError(null);
    setVinculados(null);
    countMedidoresDoColaborador(c.matricula)
      .then(setVinculados)
      .catch(() => setVinculados(null));
  };

  const closeEdit = () => setEditTarget(null);

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setModalError(null);
    setSaving(true);
    try {
      await updateColaborador(editTarget.matricula, {
        nome: editForm.nome.trim(),
        supervisor: editForm.supervisor.trim() || undefined,
        gc: editForm.gc.trim() || undefined,
        go: editForm.go.trim() || undefined,
      });
      closeEdit();
      loadColaboradores();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Erro ao salvar colaborador.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editTarget) return;
    if (
      !confirm(
        `Excluir o colaborador "${editTarget.nome}" (${editTarget.matricula})? Esta ação não pode ser desfeita.`
      )
    )
      return;
    setModalError(null);
    setDeleting(true);
    try {
      await deleteColaborador(editTarget.matricula);
      closeEdit();
      loadColaboradores();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Erro ao excluir colaborador.");
    } finally {
      setDeleting(false);
    }
  };

  if (!profile || !canManageColaboradores(profile.role)) {
    return (
      <div className="p-5 flex items-center gap-2 text-sm text-aco">
        <ShieldAlert size={16} />
        Sem permissão para acessar esta página.
      </div>
    );
  }

  const podeExcluir = vinculados === 0;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-tinta">Gestão de Colaboradores</h2>
          <p className="text-xs text-aco mt-0.5">
            {colaboradores.length} colaboradores cadastrados
            {temFiltro && ` · ${filtered.length} encontrados`}
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sinal rounded-lg hover:bg-sinal-forte transition-colors"
        >
          <UserPlus size={13} />
          Novo Colaborador
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-linha rounded-xl p-4 space-y-3">
          <p className="text-xs text-aco">
            A matrícula é o identificador único do colaborador e não pode ser alterada depois. Ela é
            gravada sempre em minúsculo.
          </p>
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-aco block mb-1">Matrícula</label>
              <input
                required
                value={newMatricula}
                onChange={(e) => setNewMatricula(e.target.value)}
                placeholder="e268779"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-aco block mb-1">Nome</label>
              <input
                required
                value={newForm.nome}
                onChange={(e) => setNewForm((f) => ({ ...f, nome: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs text-aco block mb-1">Supervisor</label>
              <input
                list="sug-supervisor"
                value={newForm.supervisor}
                onChange={(e) => setNewForm((f) => ({ ...f, supervisor: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-aco block mb-1">GC</label>
                <input
                  list="sug-gc"
                  value={newForm.gc}
                  onChange={(e) => setNewForm((f) => ({ ...f, gc: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-aco block mb-1">GO</label>
                <input
                  list="sug-go"
                  value={newForm.go}
                  onChange={(e) => setNewForm((f) => ({ ...f, go: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium text-aco border border-linha rounded-lg hover:bg-nevoa transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sinal rounded-lg hover:bg-sinal-forte transition-colors disabled:opacity-50"
            >
              <UserPlus size={13} />
              {creating ? "Cadastrando..." : "Cadastrar"}
            </button>
          </div>
        </form>
      )}

      {/* Busca + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-aco-claro" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por matrícula, nome, supervisor, GC ou GO…"
            className="w-full h-8 pl-9 pr-9 text-xs bg-white border border-linha rounded-lg focus:outline-none focus:ring-1 focus:ring-sinal-claro"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-aco-claro hover:text-tinta"
              title="Limpar busca"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <MultiSelectSearch
          label="Supervisor"
          options={opcoes.supervisor}
          selected={fSupervisor}
          onChange={(v) => { setFSupervisor(v); setPage(1); }}
        />
        <MultiSelectSearch
          label="GC"
          options={opcoes.gc}
          selected={fGc}
          onChange={(v) => { setFGc(v); setPage(1); }}
        />
        <MultiSelectSearch
          label="GO"
          options={opcoes.go}
          selected={fGo}
          onChange={(v) => { setFGo(v); setPage(1); }}
        />

        {temFiltro && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-aco border border-linha rounded-lg bg-white hover:bg-nevoa transition-colors"
          >
            <X size={12} />
            Limpar
          </button>
        )}
      </div>

      <div className="bg-white border border-linha rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 flex justify-center">
            <Loader2 size={18} className="animate-spin text-aco-claro" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-aco">
            Nenhum colaborador encontrado.
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nevoa text-left text-[10px] uppercase tracking-wide text-aco-claro">
                  <th className="px-4 py-2 font-medium">Matrícula</th>
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Supervisor</th>
                  <th className="px-4 py-2 font-medium">GC</th>
                  <th className="px-4 py-2 font-medium">GO</th>
                  <th className="px-4 py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.matricula} className="border-b border-nevoa last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-aco">{c.matricula}</td>
                    <td className="px-4 py-2.5 font-medium text-tinta">{c.nome}</td>
                    <td className="px-4 py-2.5 text-aco">{c.supervisor ?? "—"}</td>
                    <td className="px-4 py-2.5 text-aco">{c.gc ?? "—"}</td>
                    <td className="px-4 py-2.5 text-aco">{c.go ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1 text-aco-claro hover:text-sinal transition-colors rounded"
                        title="Editar colaborador"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={pageSafe}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              label="colaboradores"
            />
          </>
        )}
      </div>

      {/* Sugestões compartilhadas pelos formulários */}
      <datalist id="sug-supervisor">
        {opcoes.supervisor.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="sug-gc">
        {opcoes.gc.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="sug-go">
        {opcoes.go.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Modal de edição */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-nevoa">
              <div>
                <h3 className="text-sm font-bold text-tinta">Editar Colaborador</h3>
                <p className="text-xs text-aco-claro font-mono mt-0.5">{editTarget.matricula}</p>
              </div>
              <button onClick={closeEdit} className="text-aco-claro hover:text-tinta">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {modalError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {modalError}
                </div>
              )}

              <div>
                <label className="text-xs text-aco block mb-1">Nome</label>
                <input
                  value={editForm.nome}
                  onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-aco block mb-1">Supervisor</label>
                <input
                  list="sug-supervisor"
                  value={editForm.supervisor}
                  onChange={(e) => setEditForm((f) => ({ ...f, supervisor: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-aco block mb-1">GC</label>
                  <input
                    list="sug-gc"
                    value={editForm.gc}
                    onChange={(e) => setEditForm((f) => ({ ...f, gc: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs text-aco block mb-1">GO</label>
                  <input
                    list="sug-go"
                    value={editForm.go}
                    onChange={(e) => setEditForm((f) => ({ ...f, go: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              {vinculados !== null && vinculados > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span>
                    {vinculados} medidor{vinculados !== 1 ? "es" : ""} vinculado
                    {vinculados !== 1 ? "s" : ""} a este colaborador. Ele não pode ser excluído sem
                    apagar esse histórico.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 p-5 border-t border-nevoa">
              <button
                onClick={handleDelete}
                disabled={deleting || vinculados === null || !podeExcluir}
                title={
                  vinculados === null
                    ? "Verificando vínculos…"
                    : !podeExcluir
                      ? "Possui medidores vinculados"
                      : ""
                }
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={13} />
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={closeEdit}
                  className="px-4 py-2 text-xs font-medium text-aco border border-linha rounded-lg hover:bg-nevoa transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-white bg-sinal rounded-lg hover:bg-sinal-forte transition-colors disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
