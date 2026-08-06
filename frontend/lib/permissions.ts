import type { Role } from "./supabase";

export const MANAGER_ROLES: Role[] = ["ADMIN", "GESTOR", "SUPERVISOR"];
export const WRITE_ROLES: Role[] = ["ADMIN", "GESTOR", "SUPERVISOR", "ALMOXARIFADO"];

export function canManageUsers(role?: Role | null): boolean {
  return !!role && MANAGER_ROLES.includes(role);
}

export function canWrite(role?: Role | null): boolean {
  return !!role && WRITE_ROLES.includes(role);
}

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  SUPERVISOR: "Supervisor",
  ALMOXARIFADO: "Almoxarifado",
  DESPACHANTE: "Despachante",
};

export const assignableRoles: Role[] = ["GESTOR", "SUPERVISOR", "ALMOXARIFADO", "DESPACHANTE"];
