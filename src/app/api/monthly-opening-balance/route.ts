import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

type YearMonthResult = { year: number; month: number } | { error: string };

function parseYearMonth(url: string): YearMonthResult {
  const { searchParams } = new URL(url);
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');

  const year = Number(yearParam);
  const month = Number(monthParam);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return { error: 'year y month son obligatorios y deben ser números.' };
  }
  if (month < 1 || month > 12) {
    return { error: 'month debe estar entre 1 y 12.' };
  }

  return { year, month };
}

function getPrevYearMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function monthRangeUTC(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

function decToNumber(d: Prisma.Decimal | null | undefined) {
  if (!d) return 0;
  return Number(d.toString());
}

export async function GET(req: Request) {
  const parsed = parseYearMonth(req.url);

  if ('error' in parsed) {
    return badRequest(parsed.error);
  }

  const { year, month } = parsed;

  const rec = await prisma.monthlyOpeningBalance.findUnique({
    where: { year_month: { year, month } },
  });

  if (rec) {
    return NextResponse.json({
      year: rec.year,
      month: rec.month,
      amount: rec.amount.toString(),
      source: 'saved',
    });
  }

  const prev = getPrevYearMonth(year, month);

  const prevOpeningRec = await prisma.monthlyOpeningBalance.findUnique({
    where: { year_month: { year: prev.year, month: prev.month } },
  });
  const prevOpening = decToNumber(prevOpeningRec?.amount);

  const { start, end } = monthRangeUTC(prev.year, prev.month);

  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { kind: 'INCOME', date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { kind: 'EXPENSE', date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  const prevIncome = decToNumber(incomeAgg._sum.amount);
  const prevExpense = decToNumber(expenseAgg._sum.amount);

  const prevBalance = prevOpening + prevIncome - prevExpense;

  return NextResponse.json({
    year,
    month,
    amount: String(prevBalance),
    source: 'suggested',
    suggestedFrom: { year: prev.year, month: prev.month },
  });
}

export async function PUT(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Body inválido.');
  }

  const year = Number(body?.year);
  const month = Number(body?.month);
  const amountRaw = body?.amount;

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return badRequest('year y month son obligatorios y deben ser números.');
  }
  if (month < 1 || month > 12) {
    return badRequest('month debe estar entre 1 y 12.');
  }

  const amountNum =
    typeof amountRaw === 'string' ? Number(amountRaw) : Number(amountRaw);
  if (!Number.isFinite(amountNum)) {
    return badRequest('amount debe ser numérico.');
  }

  const rec = await prisma.monthlyOpeningBalance.upsert({
    where: { year_month: { year, month } },
    update: { amount: new Prisma.Decimal(amountNum) },
    create: { year, month, amount: new Prisma.Decimal(amountNum) },
  });

  return NextResponse.json({
    year: rec.year,
    month: rec.month,
    amount: rec.amount.toString(),
    source: 'saved',
  });
}
