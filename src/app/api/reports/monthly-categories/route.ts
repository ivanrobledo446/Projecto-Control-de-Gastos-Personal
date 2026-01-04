import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));

  if (!month || !year) {
    return NextResponse.json(
      { error: 'month and year are required' },
      { status: 400 }
    );
  }

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);

  const txs = await prisma.transaction.findMany({
    where: { date: { gte: from, lt: to } },
    include: {
      category: { include: { parent: true } }, // category = sub, parent = categoría padre
    },
  });

  const totals = new Map<string, { id: string; name: string; total: number }>();

  for (const t of txs) {
    const parent = t.category.parent ?? t.category; // por si algún día hay sin subcategoria
    const key = parent.id;
    const current = totals.get(key) ?? {
      id: parent.id,
      name: parent.name,
      total: 0,
    };
    current.total += Number(t.amount);
    totals.set(key, current);
  }

  return NextResponse.json(
    Array.from(totals.values()).sort((a, b) => b.total - a.total)
  );
}
