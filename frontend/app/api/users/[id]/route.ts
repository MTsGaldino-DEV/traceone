import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "../../../../lib/api-auth";
import type { Role } from "../../../../lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await req.json();
  const { name, email, role, is_active } = body as {
    name?: string;
    email?: string;
    role?: Role;
    is_active?: boolean;
  };

  if (email) {
    const { error } = await auth.admin!.auth.admin.updateUserById(id, {
      email,
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const profilePatch: { name?: string; role?: Role; is_active?: boolean } = {};
  if (name !== undefined) profilePatch.name = name;
  if (role !== undefined) profilePatch.role = role;
  if (is_active !== undefined) profilePatch.is_active = is_active;

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await auth.admin!.from("profiles").update(profilePatch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
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
