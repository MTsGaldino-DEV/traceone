import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "./supabase-admin";
import type { Role } from "./supabase";

const MANAGER_ROLES: Role[] = ["ADMIN", "GESTOR", "SUPERVISOR"];

export async function requireManager(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) {
    return { error: NextResponse.json({ error: "Sessão inválida" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || !profile || !MANAGER_ROLES.includes(profile.role as Role)) {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  }

  return { admin };
}
