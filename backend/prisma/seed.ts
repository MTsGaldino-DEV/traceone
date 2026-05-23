import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TraceOne database...');

  // ─── Users ─────────────────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash('admin123', 10);
  const almoxPass = await bcrypt.hash('almox123', 10);
  const gestorPass = await bcrypt.hash('gestor123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@traceone.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@traceone.com',
      password: adminPass,
      role: 'ADMIN',
    },
  });

  const almoxarife = await prisma.user.upsert({
    where: { email: 'almox@traceone.com' },
    update: {},
    create: {
      name: 'João Almoxarife',
      email: 'almox@traceone.com',
      password: almoxPass,
      role: 'ALMOXARIFE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'gestor@traceone.com' },
    update: {},
    create: {
      name: 'Maria Gestora',
      email: 'gestor@traceone.com',
      password: gestorPass,
      role: 'GESTOR',
    },
  });

  // ─── Categories ────────────────────────────────────────────────────────────
  const catEPI = await prisma.category.upsert({
    where: { name: 'EPI' },
    update: {},
    create: { name: 'EPI', description: 'Equipamentos de Proteção Individual' },
  });

  const catUniforme = await prisma.category.upsert({
    where: { name: 'Uniforme' },
    update: {},
    create: { name: 'Uniforme', description: 'Uniformes e vestimentas' },
  });

  const catFerramentas = await prisma.category.upsert({
    where: { name: 'Ferramentas' },
    update: {},
    create: { name: 'Ferramentas', description: 'Ferramentas e equipamentos' },
  });

  const catTI = await prisma.category.upsert({
    where: { name: 'TI' },
    update: {},
    create: { name: 'TI', description: 'Equipamentos de tecnologia' },
  });

  // ─── Employees ─────────────────────────────────────────────────────────────
  const emp1 = await prisma.employee.upsert({
    where: { registration: 'MAT-001' },
    update: {},
    create: {
      name: 'Carlos Eduardo Silva',
      registration: 'MAT-001',
      jobTitle: 'Operador de Manutenção',
      sector: 'Manutenção',
      unit: 'Planta A',
      status: 'ACTIVE',
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: { registration: 'MAT-002' },
    update: {},
    create: {
      name: 'Ana Paula Santos',
      registration: 'MAT-002',
      jobTitle: 'Técnica de Segurança',
      sector: 'Segurança',
      unit: 'Planta A',
      status: 'ACTIVE',
    },
  });

  const emp3 = await prisma.employee.upsert({
    where: { registration: 'MAT-003' },
    update: {},
    create: {
      name: 'Roberto Lima',
      registration: 'MAT-003',
      jobTitle: 'Eletricista',
      sector: 'Elétrica',
      unit: 'Planta B',
      status: 'ACTIVE',
    },
  });

  // ─── Items ──────────────────────────────────────────────────────────────────
  const luva = await prisma.item.upsert({
    where: { patrimonyCode: null as any },
    update: {},
    create: {
      name: 'Luva de Segurança',
      type: 'CONSUMABLE',
      categoryId: catEPI.id,
      quantity: 50,
      minStock: 10,
      unit: 'par',
      description: 'Luva de nitrilo tamanho M',
    },
  }).catch(async () =>
    prisma.item.findFirst({ where: { name: 'Luva de Segurança', type: 'CONSUMABLE' } })
  );

  const capacete = await prisma.item.findFirst({ where: { name: 'Capacete de Segurança' } }) ??
    await prisma.item.create({
      data: {
        name: 'Capacete de Segurança',
        type: 'CONSUMABLE',
        categoryId: catEPI.id,
        quantity: 20,
        minStock: 5,
        unit: 'un',
        description: 'Capacete classe A branco',
      },
    });

  const uniforme = await prisma.item.findFirst({ where: { name: 'Uniforme Operacional' } }) ??
    await prisma.item.create({
      data: {
        name: 'Uniforme Operacional',
        type: 'CONSUMABLE',
        categoryId: catUniforme.id,
        quantity: 30,
        minStock: 8,
        unit: 'conjunto',
        description: 'Calça + camisa tamanho M',
      },
    });

  const notebook = await prisma.item.findFirst({ where: { patrimonyCode: 'PAT-NB-001' } }) ??
    await prisma.item.create({
      data: {
        name: 'Notebook Dell Latitude',
        type: 'ASSET',
        categoryId: catTI.id,
        patrimonyCode: 'PAT-NB-001',
        serialNumber: 'DELL-SN-12345',
        description: 'Dell Latitude 5520 - i5 8GB 256GB',
      },
    });

  const multimetro = await prisma.item.findFirst({ where: { patrimonyCode: 'PAT-MM-001' } }) ??
    await prisma.item.create({
      data: {
        name: 'Multímetro Digital',
        type: 'ASSET',
        categoryId: catFerramentas.id,
        patrimonyCode: 'PAT-MM-001',
        serialNumber: 'FLUKE-87654',
        description: 'Fluke 87V Industrial Multimeter',
      },
    });

  // ─── Sample Movements ───────────────────────────────────────────────────────
  if (luva && luva.id) {
    // Deliver luvas to emp1
    const existing = await prisma.stockMovement.findFirst({
      where: { itemId: luva.id, employeeId: emp1.id, type: 'DELIVERY' },
    });
    if (!existing) {
      await prisma.stockMovement.create({
        data: {
          type: 'DELIVERY',
          itemId: luva.id,
          employeeId: emp1.id,
          userId: almoxarife.id,
          quantity: 2,
          notes: 'Entrega inicial',
          itemName: luva.name,
          employeeName: emp1.name,
          employeeRegistration: emp1.registration,
        },
      });
      await prisma.item.update({
        where: { id: luva.id },
        data: { quantity: { decrement: 2 } },
      });
    }
  }

  // Deliver notebook to emp2
  const notebookMovExists = await prisma.stockMovement.findFirst({
    where: { itemId: notebook.id, type: 'DELIVERY' },
  });
  if (!notebookMovExists) {
    await prisma.stockMovement.create({
      data: {
        type: 'DELIVERY',
        itemId: notebook.id,
        employeeId: emp2.id,
        userId: admin.id,
        quantity: 1,
        notes: 'Entrega de notebook para trabalho remoto',
        itemName: notebook.name,
        employeeName: emp2.name,
        employeeRegistration: emp2.registration,
      },
    });
    await prisma.item.update({
      where: { id: notebook.id },
      data: { currentHolderId: emp2.id },
    });
  }

  console.log('✅ Seed concluído!');
  console.log('');
  console.log('👤 Usuários criados:');
  console.log('   admin@traceone.com    / admin123  (ADMIN)');
  console.log('   almox@traceone.com    / almox123  (ALMOXARIFE)');
  console.log('   gestor@traceone.com   / gestor123 (GESTOR)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
