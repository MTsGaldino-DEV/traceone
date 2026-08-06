/**
 * supabase/seed.ts
 *
 * Script de seed para TraceOne usando @supabase/supabase-js com service_role key.
 * Cria: 3 usuários de teste (ADMIN, ALMOXARIFE, GESTOR) + 4 categorias + 3 colaboradores
 *
 * Executar: npx ts-node --project tsconfig.seed.json supabase/seed.ts
 * (ou: node -r ts-node/register supabase/seed.ts)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, '../frontend/.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Arquivo .env.local não encontrado em ${envPath}`);
  }
  const env: Record<string, string> = {};
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^=#][^=]*)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
  return env;
}

const env = loadEnv();

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos em frontend/.env.local');
  process.exit(1);
}

// O cliente com service_role bypassa RLS e tem acesso ao auth.admin
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Dados de seed ────────────────────────────────────────────────────────────

const users = [
  {
    email: 'admin@traceone.com',
    password: 'admin123',
    name: 'Administrador',
    role: 'ADMIN',
  },
  {
    email: 'almox@traceone.com',
    password: 'almox123',
    name: 'João Almoxarife',
    role: 'ALMOXARIFE',
  },
  {
    email: 'gestor@traceone.com',
    password: 'gestor123',
    name: 'Maria Gestora',
    role: 'GESTOR',
  },
];

const categories = [
  { name: 'EPI', description: 'Equipamentos de Proteção Individual' },
  { name: 'Uniforme', description: 'Uniformes e vestimentas' },
  { name: 'Ferramentas', description: 'Ferramentas e equipamentos' },
  { name: 'TI', description: 'Equipamentos de tecnologia' },
];

const employees = [
  {
    name: 'Carlos Eduardo Silva',
    registration: 'MAT-001',
    job_title: 'Operador de Manutenção',
    sector: 'Manutenção',
    unit: 'Planta A',
    status: 'ACTIVE',
  },
  {
    name: 'Ana Paula Santos',
    registration: 'MAT-002',
    job_title: 'Técnica de Segurança',
    sector: 'Segurança',
    unit: 'Planta A',
    status: 'ACTIVE',
  },
  {
    name: 'Roberto Lima',
    registration: 'MAT-003',
    job_title: 'Eletricista',
    sector: 'Elétrica',
    unit: 'Planta B',
    status: 'ACTIVE',
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed do TraceOne → Supabase...\n');

  // ── 1. Criar usuários Auth ────────────────────────────────────────────────
  console.log('👤 Criando usuários...');
  for (const u of users) {
    // Verificar se já existe
    const { data: existing } = await supabase.auth.admin.listUsers();
    const alreadyExists = existing?.users?.some((eu) => eu.email === u.email);

    if (alreadyExists) {
      console.log(`   ⚠️  ${u.email} já existe — pulando.`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true, // não exige confirmação de e-mail
      user_metadata: { name: u.name, role: u.role },
    });

    if (error) {
      console.error(`   ❌ Erro ao criar ${u.email}:`, error.message);
      continue;
    }

    // O trigger on_auth_user_created criará o profile automaticamente.
    // Aguardar brevemente para o trigger executar, depois confirmar.
    await new Promise((r) => setTimeout(r, 500));

    // Garantir que o profile tem o role correto (o trigger usa user_metadata)
    if (data?.user?.id) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ name: u.name, role: u.role })
        .eq('id', data.user.id);

      if (profileErr) {
        console.warn(`   ⚠️  Profile update warning for ${u.email}:`, profileErr.message);
      }
    }

    console.log(`   ✅ ${u.email} (${u.role})`);
  }

  // ── 2. Criar categorias ───────────────────────────────────────────────────
  console.log('\n📦 Criando categorias...');
  for (const cat of categories) {
    const { error } = await supabase
      .from('categories')
      .upsert({ name: cat.name, description: cat.description }, { onConflict: 'name' });

    if (error) {
      console.error(`   ❌ Erro ao criar categoria "${cat.name}":`, error.message);
    } else {
      console.log(`   ✅ ${cat.name}`);
    }
  }

  // ── 3. Criar colaboradores ────────────────────────────────────────────────
  console.log('\n👷 Criando colaboradores...');
  for (const emp of employees) {
    const { error } = await supabase
      .from('employees')
      .upsert(emp, { onConflict: 'registration' });

    if (error) {
      console.error(`   ❌ Erro ao criar colaborador "${emp.name}":`, error.message);
    } else {
      console.log(`   ✅ ${emp.name} (${emp.registration})`);
    }
  }

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed concluído!\n');
  console.log('📋 Credenciais de acesso:');
  console.log('   admin@traceone.com  / admin123  (ADMIN)');
  console.log('   almox@traceone.com  / almox123  (ALMOXARIFE)');
  console.log('   gestor@traceone.com / gestor123 (GESTOR)');
}

main().catch((e) => {
  console.error('❌ Seed falhou:', e);
  process.exit(1);
});
