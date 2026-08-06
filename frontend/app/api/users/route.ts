import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "../../../lib/api-auth";
import type { Role } from "../../../lib/supabase";
import { DEFAULT_PASSWORD } from "../../../lib/permissions";

export async function GET(req: NextRequest) {
  const auth = await requireManager(req);
  if (auth.error) return auth.error;

  const { data: profiles, error: profilesError } = await auth.admin!
    .from("profiles")
    .select("*")
    .order("name");
  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 400 });
  }

  const { data: usersList, error: usersError } = await auth.admin!.auth.admin.listUsers({
    perPage: 1000,
  });
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 400 });
  }

  const emailById = new Map(usersList.users.map((u) => [u.id, u.email ?? ""]));
  const users = (profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? "" }));

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const auth = await requireManager(req);
  if (auth.error) return auth.error;

  const body = await req.json();
  const { name, email, role } = body as { name: string; email: string; role: Role };

  if (!name || !email || !role) {
    return NextResponse.json({ error: "Campos obrigatórios: name, email, role" }, { status: 400 });
  }

  // Todo usuário novo nasce com a senha temporária padrão. Ele mesmo troca
  // pela própria senha na tela de login, usando "Primeiro acesso".
  const { error } = await auth.admin!.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
