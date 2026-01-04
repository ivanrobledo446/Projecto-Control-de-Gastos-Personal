import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SeedTree = Record<string, string[]>;

const CATEGORIES: SeedTree = {
  Supermercado: ['Almacen', 'Verduleria', 'Carniceria', 'Otros'],
  'Gastos Fijos': [
    'Alquiler',
    'Luz',
    'Gas',
    'Agua',
    'WIFI',
    'Cable',
    'Celular',
    'Plataformas',
    'Otros',
  ],
  Formacion: ['Universidad', 'Cursos', 'Fotocopias', 'Otros'],
  Ocio: [
    'Vacaciones',
    'Deporte',
    'Restaurantes',
    'Bares',
    'Delivery',
    'Juntadas',
    'Otros',
  ],
  Transporte: ['UBER', 'Colectivo', 'Otros'],
  Departamento: [
    'Muebles',
    'Electrodomesticos',
    'Reparaciones',
    'Decoracion',
    'Otros',
  ],
  Salud: [
    'Farmacia',
    'Cuidado personal',
    'Urgencias',
    'Atencion medica',
    'Otros',
  ],
  Impuestos: ['Municipal', 'Rentas'],
  Auto: ['GNC', 'Nafta', 'Mantenimiento', 'Otros'],
  Personal: ['Compras en linea', 'Otros'],
};

async function upsertParent(name: string) {
  // Como no tenemos constraint único por name+parentId en el schema,
  // buscamos primero un parent (parentId = null) con ese nombre.
  const existing = await prisma.category.findFirst({
    where: { name, parentId: null },
    select: { id: true },
  });

  if (existing) return existing;

  return prisma.category.create({
    data: { name, parentId: null },
    select: { id: true },
  });
}

async function upsertChild(parentId: string, name: string) {
  const existing = await prisma.category.findFirst({
    where: { name, parentId },
    select: { id: true },
  });

  if (existing) return existing;

  return prisma.category.create({
    data: { name, parentId },
    select: { id: true },
  });
}

async function main() {
  console.log('🌱 Seeding categories...');

  // Para que sea más determinístico, ordenamos los padres.
  const parentNames = Object.keys(CATEGORIES).sort((a, b) =>
    a.localeCompare(b)
  );

  for (const parentName of parentNames) {
    const parent = await upsertParent(parentName);

    const children = CATEGORIES[parentName];
    for (const childName of children) {
      await upsertChild(parent.id, childName);
    }
  }

  console.log('✅ Seed completed.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
