'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { readApiError } from '@/lib/api';
import type { CategoryNode, Transaction } from '@/lib/types';
import { formatMoneyARS, parseMoney } from '@/lib/money';

export default function Page() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  const isCurrentPeriod = month === currentMonth && year === currentYear;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomeTransactions, setIncomeTransactions] = useState<Transaction[]>(
    [],
  );
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)'); // tailwind "sm"
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const parentColorById = useMemo(() => {
    const m = new Map<string, string | null>();
    categories.forEach((c) => m.set(c.id, c.bgColor ?? null));
    return m;
  }, [categories]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);

    try {
      const [expenseRes, incomeRes, openingRes] = await Promise.all([
        fetch(`/api/transactions?month=${month}&year=${year}&kind=EXPENSE`),
        fetch(`/api/transactions?month=${month}&year=${year}&kind=INCOME`),
        fetch(`/api/monthly-opening-balance?month=${month}&year=${year}`),
      ]);

      if (!expenseRes.ok) throw new Error(await readApiError(expenseRes));
      if (!incomeRes.ok) throw new Error(await readApiError(incomeRes));
      if (!openingRes.ok) throw new Error(await readApiError(openingRes));

      const expenseData = await expenseRes.json();
      const incomeData = await incomeRes.json();
      const openingData = await openingRes.json();

      setTransactions(Array.isArray(expenseData) ? expenseData : []);
      setIncomeTransactions(Array.isArray(incomeData) ? incomeData : []);
      setOpeningBalance(Number(openingData?.amount ?? 0));
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudieron cargar los datos.');
      setTransactions([]);
      setIncomeTransactions([]);
      setOpeningBalance(0);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const loadCategoriesTree = useCallback(async () => {
    try {
      const res = await fetch('/api/categories/expenses?tree=1');
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudieron cargar las categorías.');
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadCategoriesTree();
  }, [loadCategoriesTree]);

  const pieData = useMemo(() => {
    const byParent = new Map<
      string,
      { name: string; value: number; color?: string | null }
    >();

    for (const t of transactions) {
      const v = parseMoney(t.amount);
      if (!v) continue;

      const parentId = t.category.parent?.id ?? t.category.id;
      const parentName = t.category.parent?.name ?? t.category.name;

      const prev = byParent.get(parentId);
      if (prev) prev.value += v;
      else
        byParent.set(parentId, {
          name: parentName,
          value: v,
          color: parentColorById.get(parentId) ?? null,
        });
    }

    return Array.from(byParent.values()).sort((a, b) => b.value - a.value);
  }, [transactions, parentColorById]);

  const pieDataDisplay = useMemo(() => {
    if (!isMobile) return pieData;

    const MAX = 15;
    if (pieData.length <= MAX) return pieData;

    const top = pieData.slice(0, MAX);
    const rest = pieData.slice(MAX);

    const othersValue = rest.reduce((sum, x) => sum + (x.value ?? 0), 0);

    return [
      ...top,
      {
        name: 'Otros',
        value: othersValue,
        color: '#64748b',
      },
    ];
  }, [pieData, isMobile]);

  const expenseTotal = useMemo(
    () => transactions.reduce((sum, t) => sum + parseMoney(t.amount), 0),
    [transactions],
  );

  const incomeTotal = useMemo(
    () => incomeTransactions.reduce((sum, t) => sum + parseMoney(t.amount), 0),
    [incomeTransactions],
  );

  const availableTotal = useMemo(
    () => incomeTotal + openingBalance,
    [incomeTotal, openingBalance],
  );

  const balance = useMemo(
    () => availableTotal - expenseTotal,
    [availableTotal, expenseTotal],
  );

  const spentPct = useMemo(() => {
    if (availableTotal <= 0) return null;
    return (expenseTotal / availableTotal) * 100;
  }, [availableTotal, expenseTotal]);

  const monthName = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
  }).format(new Date(year, month - 1));

  const goToCurrentPeriod = useCallback(() => {
    setMonth(currentMonth);
    setYear(currentYear);
  }, [currentMonth, currentYear]);

  const goPrevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    // si ya estás en el mes actual, no avanzás más
    if (isCurrentPeriod) return;

    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }, [isCurrentPeriod]);

  async function adjustOpeningBalance() {
    const result = await Swal.fire({
      title: 'Ajustar saldo inicial',
      input: 'number',
      inputLabel: `Saldo inicial para ${month}/${year}`,
      inputValue: openingBalance,
      inputAttributes: { step: '1' },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    const v = Number(result.value);
    if (!Number.isFinite(v)) {
      toast.error('Ingresá un número válido.');
      return;
    }

    const res = await fetch('/api/monthly-opening-balance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, amount: v }),
    });

    if (!res.ok) {
      toast.error(await readApiError(res));
      return;
    }

    setOpeningBalance(v);
    toast.success('Saldo inicial actualizado');
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Resumen {monthName.charAt(0).toUpperCase() + monthName.slice(1)} del{' '}
            {year}
          </h1>
          <p className="text-sm text-muted mt-1">
            Vista general de ingresos, gastos y distribución.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={loading}
            className="px-3 py-2 text-sm rounded-md border border-[var(--border)] hover:bg-white/5 transition disabled:opacity-60"
          >
            ←
          </button>

          <input
            type="number"
            value={month}
            disabled={loading}
            min={1}
            max={12}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-20 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-60"
          />

          <input
            type="number"
            value={year}
            disabled={loading}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-28 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-60"
          />

          <button
            type="button"
            onClick={goNextMonth}
            disabled={loading || isCurrentPeriod}
            className="px-3 py-2 text-sm rounded-md border border-[var(--border)] hover:bg-white/5 transition disabled:opacity-50 disabled:hover:bg-transparent"
          >
            →
          </button>

          {!isCurrentPeriod ? (
            <button
              type="button"
              onClick={goToCurrentPeriod}
              disabled={loading}
              className="px-3 py-2 text-sm rounded-md border border-[var(--border)] hover:bg-white/5 transition disabled:opacity-60"
            >
              Hoy
            </button>
          ) : null}
        </div>
      </div>

      <section className="mb-6 card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Resumen del mes
          </h2>

          {isCurrentPeriod ? (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
              <button
                type="button"
                onClick={adjustOpeningBalance}
                disabled={loading}
                className="col-span-2 sm:col-auto px-3 py-1.5 text-sm rounded-md border border-[var(--border)] hover:bg-white/5 transition disabled:opacity-60"
              >
                <span className="sm:hidden">Ajustar saldo</span>
                <span className="hidden sm:inline">Ajustar saldo inicial</span>
              </button>

              <Link
                href="/transactions/expenses"
                className="px-3 py-1.5 text-sm rounded-md border border-[var(--border)] hover:bg-white/5 transition text-center"
              >
                Ver gastos
              </Link>

              <Link
                href="/transactions/income"
                className="px-3 py-1.5 text-sm rounded-md border border-[var(--border)] hover:bg-white/5 transition text-center"
              >
                Ver ingresos
              </Link>
            </div>
          ) : (
            <span className="text-xs text-muted">
              Estás viendo un mes anterior.
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted">
            Cargando información…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--border)] p-4">
              <div className="text-sm text-muted">Ingresos</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {formatMoneyARS(incomeTotal)}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-4">
              <div className="text-sm text-muted">Saldo inicial</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {formatMoneyARS(openingBalance)}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-4">
              <div className="text-sm text-muted">Gastos</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {formatMoneyARS(expenseTotal)}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-4">
              <div className="text-sm text-muted">Balance</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {formatMoneyARS(balance)}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-4">
              <div className="text-sm text-muted">% gastado</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {spentPct == null ? '—' : `${spentPct.toFixed(0)}%`}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mb-6 card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Distribución por categoría
          </h2>
        </div>

        {pieData.length === 0 ? (
          <div className="text-sm text-muted">No hay datos para graficar.</div>
        ) : (
          <div>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataDisplay}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy={isMobile ? '40%' : '50%'}
                    outerRadius={isMobile ? 75 : 110}
                    label={
                      !isMobile && pieDataDisplay.length <= 8
                        ? ({ name, percent }) =>
                            percent !== undefined
                              ? `${name} ${(percent * 100).toFixed(0)}%`
                              : name
                        : false
                    }
                    labelLine={false}
                  >
                    {pieDataDisplay.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color ?? '#64748b'}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value: any) => [
                      formatMoneyARS(Number(value) || 0),
                      'Total',
                    ]}
                    contentStyle={{
                      background: '#020617',
                      border: '1px solid #1e293b',
                      borderRadius: 10,
                      color: '#e2e8f0',
                    }}
                    itemStyle={{ color: '#e2e8f0' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />

                  {!isMobile ? (
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ paddingLeft: 12, color: '#e2e8f0' }}
                    />
                  ) : null}
                </PieChart>
              </ResponsiveContainer>
            </div>

            {isMobile ? (
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {pieDataDisplay.map((e) => (
                  <div key={e.name} className="flex items-start gap-2 min-w-0">
                    <span
                      className="mt-1 inline-block h-3 w-3 rounded-sm shrink-0"
                      style={{ backgroundColor: e.color ?? '#64748b' }}
                    />
                    <span
                      title={e.name}
                      className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                      {e.name}
                    </span>
                    <span className="shrink-0 text-muted tabular-nums">
                      {expenseTotal <= 0
                        ? '0%'
                        : ((e.value / expenseTotal) * 100).toFixed(0) + '%'}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
