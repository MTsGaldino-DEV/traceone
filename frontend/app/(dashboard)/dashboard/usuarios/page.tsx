"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Pencil, Loader2, ShieldAlert, X, Send, CheckCircle2 } from "lucide-react";
import {
  getProfile,
  getUsersWithEmail,
  createUser,
  updateUserProfile,
  deleteUser,
  requestPasswordReset,
} from "../../../../lib/api";
import type { UserWithEmail } from "../../../../lib/api";
import type { Profile, Role } from "../../../../lib/supabase";
import { canManageUsers, roleLabels, assignableRoles, DEFAULT_PASSWORD } from "../../../../lib/permissions";

export default function UsuariosPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<UserWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convite de novo usuário
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("DESPACHANTE");
  const [inviting, setInviting] = useState(false);

  // Modal de edição
  const [editUser, setEditUser] = useState<UserWithEmail | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("DESPACHANTE");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadUsers = () => {
    setLoading(true);
    getUsersWithEmail()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      if (!canManageUsers(p?.role)) {
        router.replace("/dashboard");
        return;
      }
      loadUsers();
    });
  }, [router]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviting(true);
    try {
      await createUser({ name, email, role });
      setShowForm(false);
      setName("");
      setEmail("");
      setRole("DESPACHANTE");
      loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao convidar usuário.");
    } finally {
      setInviting(false);
    }
  };

  const openEdit = (u: UserWithEmail) => {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditActive(u.is_active);
    setModalError(null);
    setResetSent(false);
  };

  const closeEdit = () => setEditUser(null);

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setModalError(null);
    setSaving(true);
    try {
      const patch: Parameters<typeof updateUserProfile>[1] = {};
      if (editName !== editUser.name) patch.name = editName;
      if (editEmail !== editUser.email) patch.email = editEmail;
      if (editRole !== editUser.role) patch.role = editRole;
      if (editActive !== editUser.is_active) patch.is_active = editActive;

      if (Object.keys(patch).length > 0) {
        await updateUserProfile(editUser.id, patch);
        loadUsers();
      }
      closeEdit();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Erro ao salvar usuário.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendReset = async () => {
    if (!editUser) return;
    setModalError(null);
    setSendingReset(true);
    try {
      await requestPasswordReset(editUser.email);
      setResetSent(true);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Erro ao enviar link.");
    } finally {
      setSendingReset(false);
    }
  };

  const handleDelete = async () => {
    if (!editUser) return;
    if (!confirm(`Excluir o usuário "${editUser.name}"? Esta ação não pode ser desfeita.`)) return;
    setModalError(null);
    setDeleting(true);
    try {
      await deleteUser(editUser.id);
      closeEdit();
      loadUsers();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Erro ao excluir usuário.");
    } finally {
      setDeleting(false);
    }
  };

  if (!profile || !canManageUsers(profile.role)) {
    return (
      <div className="p-5 flex items-center gap-2 text-sm text-aco">
        <ShieldAlert size={16} />
        Sem permissão para acessar esta página.
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-tinta">Gestão de Usuários</h2>
          <p className="text-xs text-aco mt-0.5">{users.length} usuários cadastrados</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sinal rounded-lg hover:bg-sinal-forte transition-colors"
        >
          <UserPlus size={13} />
          Novo Usuário
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleInvite}
          className="bg-white border border-linha rounded-xl p-4 space-y-3"
        >
          <p className="text-xs text-aco">
            O usuário nasce com a senha temporária padrão <strong>{DEFAULT_PASSWORD}</strong>. Oriente-o a usar &quot;Primeiro acesso&quot; na tela de login pra definir a própria senha — você não vê nem define a senha definitiva de ninguém.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-aco block mb-1">Nome</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-linha rounded-lg focus:outline-none focus:ring-1 focus:ring-sinal-claro"
              />
            </div>
            <div>
              <label className="text-xs text-aco block mb-1">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-linha rounded-lg focus:outline-none focus:ring-1 focus:ring-sinal-claro"
              />
            </div>
            <div>
              <label className="text-xs text-aco block mb-1">Papel</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full h-9 px-3 text-sm border border-linha rounded-lg focus:outline-none focus:ring-1 focus:ring-sinal-claro bg-white"
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </select>
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
              disabled={inviting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sinal rounded-lg hover:bg-sinal-forte transition-colors disabled:opacity-50"
            >
              <UserPlus size={13} />
              {inviting ? "Criando..." : "Criar Usuário"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-linha rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 flex justify-center">
            <Loader2 size={18} className="animate-spin text-aco-claro" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nevoa text-left text-[10px] uppercase tracking-wide text-aco-claro">
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Papel</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-nevoa last:border-0">
                  <td className="px-4 py-2.5 font-medium text-tinta">{u.name}</td>
                  <td className="px-4 py-2.5 text-aco">{u.email}</td>
                  <td className="px-4 py-2.5 text-aco">{roleLabels[u.role] ?? u.role}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-linha text-aco"
                      }`}
                    >
                      {u.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1 text-aco-claro hover:text-sinal transition-colors rounded"
                      title="Editar usuário"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de edição */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-nevoa">
              <h3 className="text-sm font-bold text-tinta">Editar Usuário</h3>
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-linha rounded-lg focus:outline-none focus:ring-1 focus:ring-sinal-claro"
                />
              </div>
              <div>
                <label className="text-xs text-aco block mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={editUser.role === "ADMIN"}
                  className="w-full h-9 px-3 text-sm border border-linha rounded-lg focus:outline-none focus:ring-1 focus:ring-sinal-claro disabled:bg-nevoa disabled:text-aco-claro"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-aco block mb-1">Papel</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                    disabled={editUser.role === "ADMIN"}
                    className="w-full h-9 px-3 text-sm border border-linha rounded-lg bg-white disabled:bg-nevoa disabled:text-aco-claro"
                  >
                    {editUser.role === "ADMIN" && <option value="ADMIN">{roleLabels.ADMIN}</option>}
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {roleLabels[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-aco block mb-1">Status</label>
                  <button
                    type="button"
                    onClick={() => setEditActive((a) => !a)}
                    disabled={editUser.role === "ADMIN"}
                    className={`w-full h-9 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                      editActive ? "bg-emerald-100 text-emerald-700" : "bg-linha text-aco"
                    }`}
                  >
                    {editActive ? "Ativo" : "Inativo"}
                  </button>
                </div>
              </div>

              <div className="border-t border-nevoa pt-3">
                <p className="text-xs text-aco mb-2">
                  A senha é definida pelo próprio usuário. Pra redefinir, envie um link por email.
                </p>
                <button
                  type="button"
                  onClick={handleSendReset}
                  disabled={sendingReset || resetSent}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sinal-forte bg-sinal-fundo border border-sinal-fundo rounded-lg hover:bg-sinal-fundo transition-colors disabled:opacity-60"
                >
                  {resetSent ? <CheckCircle2 size={13} /> : <Send size={13} />}
                  {resetSent ? "Link enviado" : sendingReset ? "Enviando..." : "Enviar link de redefinição de senha"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-5 border-t border-nevoa">
              {editUser.role !== "ADMIN" ? (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  {deleting ? "Excluindo..." : "Excluir"}
                </button>
              ) : <span />}
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
