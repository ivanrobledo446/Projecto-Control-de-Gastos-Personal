'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  LeadingActions,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import Link from 'next/link';

import { readApiError } from '@/lib/api';
import {
  isoDateToInputValue,
  todayAsInputValue,
  toLocalDate,
} from '@/lib/dates';
import type { CategoryNode, Transaction, TxCategory } from '@/lib/types';
import { formatMoneyARS, parseMoney } from '@/lib/money';

function formatCategoryLabel(c: TxCategory) {
  const parent = c.parent?.name;
  return parent ? `${parent} > ${c.name}` : c.name;
}

export default function HomePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [swipeResetKey, setSwipeResetKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Create form
  const [date, setDate] = useState(todayAsInputValue());
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState(todayAsInputValue());
  const [editParentCategoryId, setEditParentCategoryId] = useState('');
  const [editSubCategoryId, setEditSubCategoryId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const parentColorById = useMemo(() => {
    const m = new Map<string, string | null>();
    categories.forEach((c) => m.set(c.id, c.bgColor ?? null));
    return m;
  }, [categories]);

  const selectedParent = useMemo(
    () => categories.find((c) => c.id === parentCategoryId) || null,
    [categories, parentCategoryId]
  );

  const subcategories = selectedParent?.children ?? [];

  const editSelectedParent = useMemo(
    () => categories.find((c) => c.id === editParentCategoryId) || null,
    [categories, editParentCategoryId]
  );
  const editSubcategories = editSelectedParent?.children ?? [];

  useEffect(() => {
    setSubCategoryId('');
  }, [parentCategoryId]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const loadTransactions = useCallback(async (m: number, y: number) => {
    try {
      const res = await fetch(
        `/api/transactions?month=${m}&year=${y}&kind=INCOME`
      );
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudieron cargar los ingresos.');
      setTransactions([]);
    }
  }, []);

  const loadCategoriesTree = useCallback(async () => {
    try {
      const res = await fetch('/api/categories/income?tree=1');
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudieron cargar las categorías.');
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    loadTransactions(month, year);
  }, [month, year, loadTransactions]);

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

  const total = useMemo(
    () =>
      transactions.reduce((sum, t) => {
        return sum + parseMoney(t.amount);
      }, 0),
    [transactions]
  );

  const openEditTransaction = useCallback(
    (t: Transaction) => {
      const directParentId = t.category.parent?.id ?? '';
      const subId = t.category.id;

      const inferredParentId =
        directParentId ||
        categories.find((p) => (p.children ?? []).some((ch) => ch.id === subId))
          ?.id ||
        '';

      setEditingTxId(t.id);
      setEditDate(isoDateToInputValue(t.date));
      setEditParentCategoryId(inferredParentId);
      setEditSubCategoryId(subId);
      setEditAmount(String(t.amount ?? ''));
      setEditNote(t.note ?? '');
    },
    [categories]
  );

  const closeEditModal = useCallback(() => setEditingTxId(null), []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!date) return toast.error('La fecha es obligatoria.');
      if (!parentCategoryId) return toast.error('Elegí una categoría.');
      if (!subCategoryId) return toast.error('Elegí una subcategoría.');
      if (!amount || Number(amount) <= 0)
        return toast.error('Ingresá un monto válido.');

      try {
        setSaving(true);
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            amount: String(amount),
            categoryId: subCategoryId,
            note: note.trim() ? note.trim() : null,
            kind: 'INCOME',
          }),
        });

        if (!res.ok) throw new Error(await readApiError(res));

        toast.success('Ingreso agregado');
        setAmount('');
        setNote('');
        await loadTransactions(month, year);
      } catch (err: any) {
        toast.error(err?.message ?? 'Error inesperado.');
      } finally {
        setSaving(false);
      }
    },
    [
      date,
      parentCategoryId,
      subCategoryId,
      amount,
      note,
      loadTransactions,
      month,
      year,
    ]
  );

  const saveEditedTransaction = useCallback(async () => {
    if (!editingTxId) return;

    if (!editDate) return toast.error('La fecha es obligatoria.');
    if (!editParentCategoryId) return toast.error('Elegí una categoría.');
    if (!editSubCategoryId) return toast.error('Elegí una subcategoría.');
    if (!editAmount || Number(editAmount) <= 0)
      return toast.error('Ingresá un monto válido.');

    try {
      setEditSaving(true);
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTxId,
          date: editDate,
          amount: String(editAmount),
          categoryId: editSubCategoryId,
          note: editNote.trim() ? editNote.trim() : null,
          kind: 'INCOME',
        }),
      });

      if (!res.ok) throw new Error(await readApiError(res));

      toast.success('Ingreso actualizado');

      const edited = new Date(editDate + 'T00:00:00');
      const editedMonth = edited.getMonth() + 1;
      const editedYear = edited.getFullYear();
      if (editedMonth !== month || editedYear !== year) {
        toast.info(`El ingreso se movió a ${editedMonth}/${editedYear}`);
      }

      closeEditModal();
      await loadTransactions(month, year);
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo actualizar el ingreso.');
    } finally {
      setEditSaving(false);
    }
  }, [
    editingTxId,
    editDate,
    editParentCategoryId,
    editSubCategoryId,
    editAmount,
    editNote,
    closeEditModal,
    loadTransactions,
    month,
    year,
  ]);

  const confirmAndDeleteTransaction = useCallback(
    async (t: Transaction) => {
      const result = await Swal.fire({
        title: '¿Eliminar ingreso?',
        text: `${formatCategoryLabel(t.category)} — ${formatMoneyARS(
          parseMoney(t.amount)
        )}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#374151',
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
      });

      if (!result.isConfirmed) {
        setSwipeResetKey((k) => k + 1);
        return;
      }

      const res = await fetch(`/api/transactions?id=${t.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        toast.error(await readApiError(res));
        return;
      }

      toast.success('Ingreso eliminado');
      await loadTransactions(month, year);
    },
    [loadTransactions, month, year]
  );

  const leadingActionsFor = useCallback(
    (t: Transaction) => (
      <LeadingActions>
        <SwipeAction
          onClick={() => openEditTransaction(t)}
          className="relative !p-0 bg-white/10 border-r border-[var(--border)]"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-[var(--text)]">
            Editar
          </div>
        </SwipeAction>
      </LeadingActions>
    ),
    [openEditTransaction]
  );

  const trailingActionsFor = useCallback(
    (t: Transaction) => (
      <TrailingActions>
        <SwipeAction
          onClick={() => confirmAndDeleteTransaction(t)}
          destructive={false}
          className="relative !p-0 bg-white/10 border-l border-[var(--border)]"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-[var(--text)]">
            Eliminar
          </div>
        </SwipeAction>
      </TrailingActions>
    ),
    [confirmAndDeleteTransaction]
  );

  const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(
    new Date(year, month - 1)
  );
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">
          Ingresos {monthLabel} del {year}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Registrá, editá y eliminá ingresos. Deslizá para acciones rápidas.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          value={month}
          min={1}
          max={12}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="w-20 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:ring-2 focus:ring-white/10"
        />
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:ring-2 focus:ring-white/10"
        />
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Distribución por categoría</h2>
          <Link
            className="text-sm rounded-md border border-[var(--border)] px-3 py-1.5 text-[var(--text)] hover:bg-white/5 transition"
            href="/categories/income"
          >
            Administrar categorías
          </Link>
        </div>

        {pieData.length === 0 ? (
          <div className="text-sm text-[var(--muted)]">
            No hay datos para graficar.
          </div>
        ) : (
          <div>
            {/* Alto SOLO para el chart */}
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataDisplay}
                    dataKey="value"
                    nameKey="name"
                    cx={!isMobile ? '40%' : '50%'}
                    cy={isMobile ? '48%' : '50%'}
                    outerRadius={isMobile ? 75 : 110}
                    label={
                      !isMobile && pieDataDisplay.length <= 8
                        ? ({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
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
                  />

                  {!isMobile ? (
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ paddingLeft: 12 }}
                    />
                  ) : null}
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda custom solo en mobile */}
            {isMobile ? (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
                    <span className="shrink-0 text-[var(--muted)] tabular-nums">
                      {total <= 0
                        ? '0%'
                        : `${((e.value / total) * 100).toFixed(0)}%`}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--muted)] uppercase mb-4">
          Registrar nuevo ingreso
        </h2>

        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs mb-1 text-[var(--muted)]">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-[var(--muted)]">
              Categoría
            </label>
            <select
              value={parentCategoryId}
              onChange={(e) => setParentCategoryId(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
            >
              <option value="">Seleccionar...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1 text-[var(--muted)]">
              Subcategoría
            </label>
            <select
              value={subCategoryId}
              onChange={(e) => setSubCategoryId(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
              disabled={!parentCategoryId}
            >
              <option value="">
                {parentCategoryId
                  ? 'Seleccionar...'
                  : 'Elegí una categoría primero'}
              </option>
              {subcategories.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1 text-[var(--muted)]">
              Monto
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs mb-1 text-[var(--muted)]">
              Descripción (opcional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-white/10 transition disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Agregar ingreso'}
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-4 text-sm text-[var(--muted)]">
            No hay ingresos para este período.
          </div>
        ) : (
          <SwipeableList key={swipeResetKey}>
            {transactions.map((t) => {
              const parentId = t.category.parent?.id ?? t.category.id;

              return (
                <SwipeableListItem
                  key={t.id}
                  leadingActions={leadingActionsFor(t)}
                  trailingActions={trailingActionsFor(t)}
                >
                  <div className="relative w-full flex min-h-[88px] border-b border-[var(--border)] last:border-b-0 bg-transparent">
                    <div
                      className="w-4"
                      style={{
                        backgroundColor:
                          parentColorById.get(parentId) ?? '#374151',
                      }}
                    />

                    <div className="p-4 md:p-5 flex justify-between gap-4 w-full">
                      <div className="min-w-0">
                        <div className="font-semibold text-base md:text-lg truncate">
                          {formatCategoryLabel(t.category)}
                        </div>

                        <div className="text-sm text-[var(--muted)] mt-1">
                          {toLocalDate(t.date)}
                          {t.note ? ` — ${t.note}` : ''}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-lg md:text-xl">
                          {formatMoneyARS(parseMoney(t.amount))}
                        </div>
                      </div>
                    </div>
                  </div>
                </SwipeableListItem>
              );
            })}
          </SwipeableList>
        )}
      </section>

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-[var(--muted)]">Total del período</span>
        <span className="text-lg font-bold tabular-nums">
          Total: {formatMoneyARS(total)}
        </span>
      </div>

      {editingTxId ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] p-5">
            <h3 className="font-semibold text-lg mb-3">Editar ingreso</h3>

            <div className="grid gap-3">
              <div>
                <label className="block text-xs mb-1 text-[var(--muted)]">
                  Fecha
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10"
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-[var(--muted)]">
                  Categoría
                </label>
                <select
                  value={editParentCategoryId}
                  onChange={(e) => {
                    setEditParentCategoryId(e.target.value);
                    setEditSubCategoryId('');
                  }}
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10"
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-[var(--muted)]">
                  Subcategoría
                </label>
                <select
                  value={editSubCategoryId}
                  onChange={(e) => setEditSubCategoryId(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10"
                  disabled={!editParentCategoryId}
                >
                  <option value="">
                    {editParentCategoryId
                      ? 'Seleccionar...'
                      : 'Elegí una categoría primero'}
                  </option>
                  {editSubcategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1 text-[var(--muted)]">
                  Monto
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10"
                />
              </div>

              <div>
                <label className="block text-xs mb-1 text-[var(--muted)]">
                  Descripción (opcional)
                </label>
                <input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  className="px-4 py-2 rounded-md border border-[var(--border)] hover:bg-white/5 transition"
                  onClick={closeEditModal}
                  disabled={editSaving}
                >
                  Cancelar
                </button>

                <button
                  className="px-4 py-2 rounded-md border border-[var(--border)] bg-white/10 hover:bg-white/15 transition disabled:opacity-60"
                  onClick={saveEditedTransaction}
                  disabled={editSaving}
                >
                  {editSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
