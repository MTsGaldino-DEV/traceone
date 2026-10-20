import type { Role } from "./supabase";

// Espelha as regras do banco (migration 045). A tela esconde o que o papel não
// pode fazer; a trava de verdade fica no banco.
//
//   ADMIN            tudo
//   GESTOR           tudo, inclusive Backup, Automação GDIS e Log de auditoria
//   ALMOXARIFADO_211 almoxarifado que também vincula serviço
//   SUPERVISOR       reatribui, não vincula serviço
//   ALMOXARIFADO     reatribui, não vincula serviço
//   DESPACHANTE      só leitura

export const MANAGER_ROLES: Role[] = ["ADMIN", "GESTOR", "SUPERVISOR"];
export const WRITE_ROLES: Role[] = ["ADMIN", "GESTOR", "SUPERVISOR", "ALMOXARIFADO", "ALMOXARIFADO_211"];
/** Gravar número de serviço GDIS num medidor, em qualquer tela ou importação. */
export const VINCULO_ROLES: Role[] = ["ADMIN", "GESTOR", "ALMOXARIFADO_211"];
const GESTAO_ROLES: Role[] = ["ADMIN", "GESTOR"];

export function canManageUsers(role?: Role | null): boolean {
  return !!role && MANAGER_ROLES.includes(role);
}

export function isAdmin(role?: Role | null): boolean {
  return role === "ADMIN";
}

/** Cadastro de colaboradores: quem escreve no sistema, incluindo o almoxarifado. */
export function canManageColaboradores(role?: Role | null): boolean {
  return !!role && WRITE_ROLES.includes(role);
}

export function canWrite(role?: Role | null): boolean {
  return !!role && WRITE_ROLES.includes(role);
}

/**
 * Vincular, trocar ou importar número de serviço: Conferência, +45 dias, edição
 * na Lista, Duplicidade, relatório GDIS e planilhas PC/TC/Lucas.
 */
export function canVincularServico(role?: Role | null): boolean {
  return !!role && VINCULO_ROLES.includes(role);
}

/** Passar por cima da trava de matrícula não cadastrada no import do GDIS. */
export function canForcarImportacao(role?: Role | null): boolean {
  return canVincularServico(role);
}

/** Abas Backup e Automação GDIS, e o Log de auditoria (menu do perfil). */
export function canGestao(role?: Role | null): boolean {
  return !!role && GESTAO_ROLES.includes(role);
}

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  SUPERVISOR: "Supervisor",
  ALMOXARIFADO: "Almoxarifado",
  ALMOXARIFADO_211: "Almoxarifado 211",
  DESPACHANTE: "Despachante",
};

export const assignableRoles: Role[] = ["GESTOR", "SUPERVISOR", "ALMOXARIFADO_211", "ALMOXARIFADO", "DESPACHANTE"];

// Todo usuário novo é criado com essa senha temporária; ele troca pela
// própria senha via "Primeiro acesso" na tela de login.
export const DEFAULT_PASSWORD = "123456";
