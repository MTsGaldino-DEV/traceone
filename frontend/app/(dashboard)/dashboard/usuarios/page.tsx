"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { getProfile, getUsers, createUser, deleteUser, updateUserRole } from "../../../../lib/api";
import type { Profile, Role } from "../../../../lib/supabase";
import { canManageUsers, roleLabels, assignableRoles } from "../../../../lib/permissions";

export default function UsuariosPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("DESPACHANTE");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = () => {
    setLoading(true);
    getUsers()
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await createUser({ name, email, password, role });
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("DESPACHANTE");
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: Role) => {
    setError(null);
    try {
      await updateUserRole(id, { role: newRole });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setError(null);
    try {
      await updateUserRole(id, { is_active: !isActive });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este usuário? Esta ação não pode ser desfeita.")) return;
    setError(null);
    setDeletingId(id);
    try {
      await deleteUser(id);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (!profile || !canManageUsers(profile.role)) {
    return (
      <div className="p-5 flex items-center gap-2 text-sm text-[#64748b]">
        <ShieldAlert size={16} />
        Sem permissão para acessar esta página.
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#0f172a]">Gestão de Usuários</h2>
          <p className="text-xs text-[#64748b] mt-0.5">{users.length} usuários cadastrados</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
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
          onSubmit={handleCreate}
          className="bg-white border border-[#e5e7eb] rounded-xl p-4 grid grid-cols-2 gap-3"
        >
          <div>
            <label className="text-xs text-[#64748b] block mb-1">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748b] block mb-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748b] block mb-1">Senha</label>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748b] block mb-1">Papel</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full h-9 px-3 text-sm border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium text-[#64748b] border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {creating ? "Criando..." : "Criar Usuário"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 flex justify-center">
            <Loader2 size={18} className="animate-spin text-[#94a3b8]" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#f1f5f9] text-left text-[10px] uppercase tracking-wide text-[#94a3b8]">
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Papel</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#f1f5f9] last:border-0">
                  <td className="px-4 py-2.5 font-medium text-[#0f172a]">{u.name}</td>
                  <td className="px-4 py-2.5">
                    {u.role === "ADMIN" ? (
                      <span className="text-xs text-[#64748b]">{roleLabels.ADMIN}</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="h-8 px-2 text-xs border border-[#e5e7eb] rounded-lg bg-white"
                      >
                        {assignableRoles.map((r) => (
                          <option key={r} value={r}>
                            {roleLabels[r]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      disabled={u.role === "ADMIN"}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold disabled:opacity-50 ${
                        u.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {u.is_active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {u.role !== "ADMIN" && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deletingId === u.id}
                        className="p-1 text-[#9ca3af] hover:text-red-600 transition-colors rounded disabled:opacity-50"
                        title="Excluir usuário"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
