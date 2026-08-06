import { createClient } from "@supabase/supabase-js";

// Uso exclusivo em código server-side (route handlers). Nunca importar em
// componentes/módulos que rodam no cliente — a service_role key não pode
// vazar para o bundle do browser.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
