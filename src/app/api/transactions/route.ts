import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { CategoryKind } from '@prisma/client';

function parseKind(raw: string | null): CategoryKind | null {
  if (!raw) return null;
  const v = raw.toUpperCase();
  if (v === 'EXPENSE' || v === 'INCOME') return v as CategoryKind;
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));
  const kind = parseKind(searchParams.get('kind')) ?? 'EXPENSE';

  if (!month || !year) {
    return NextResponse.json(
      { error: 'month and year are required' },
      { status: 400 }
    );
  }

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: from, lt: to },
      kind,
    },
    include: { category: { include: { parent: true } } },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { date, amount, categoryId, note } = body;

  // default: EXPENSE (para que la UI actual no se rompa)
  const kind = parseKind(body?.kind) ?? 'EXPENSE';

  if (!date || !amount || !categoryId) {
    return NextResponse.json(
      { error: 'date, amount and categoryId are required' },
      { status: 400 }
    );
  }

  // ✅ asegura que la categoría pertenezca al kind pedido
  const category = await prisma.category.findFirst({
    where: { id: String(categoryId), kind },
    select: { id: true },
  });

  if (!category) {
    return NextResponse.json(
      { error: `Category not found for kind ${kind}` },
      { status: 400 }
    );
  }

  const transaction = await prisma.transaction.create({
    data: {
      date: new Date(date + 'T00:00:00'),
      amount: String(amount),
      categoryId: String(categoryId),
      note: note ?? null,
      kind,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, date, amount, categoryId, note } = body;

  const kind = parseKind(body?.kind) ?? 'EXPENSE';

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  if (!date || !amount || !categoryId) {
    return NextResponse.json(
      { error: 'date, amount and categoryId are required' },
      { status: 400 }
    );
  }

  // ✅ asegura que la categoría pertenezca al kind pedido
  const category = await prisma.category.findFirst({
    where: { id: String(categoryId), kind },
    select: { id: true },
  });

  if (!category) {
    return NextResponse.json(
      { error: `Category not found for kind ${kind}` },
      { status: 400 }
    );
  }

  try {
    const tx = await prisma.transaction.update({
      where: { id: String(id) },
      data: {
        date: new Date(date + 'T00:00:00'),
        amount: String(amount),
        categoryId: String(categoryId),
        note: note ?? null,
        kind,
      },
    });

    return NextResponse.json(tx);
  } catch {
    return NextResponse.json(
      { error: 'Transaction not found or cannot be updated' },
      { status: 404 }
    );
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    await prisma.transaction.delete({ where: { id: String(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Transaction not found or cannot be deleted' },
      { status: 404 }
    );
  }
}
