import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase-admin";
import type { Role } from "../../../../lib/supabase";

const MANAGER_ROLES: Role[] = ["ADMIN", "GESTOR", "SUPERVISOR"];

async function requireManager(req: NextRequest) {
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { error } = await auth.admin!.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
