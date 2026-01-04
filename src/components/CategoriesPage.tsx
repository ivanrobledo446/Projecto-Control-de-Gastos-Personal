'use client';

import { useEffect, useMemo, useState } from 'react';
import { readApiError, textColorForBg } from '@/lib/categories';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

type CategoryNode = {
  id: string;
  name: string;
  parentId: string | null;
  bgColor?: string | null;
  childrenBgColor?: string | null;
  children?: CategoryNode[];
};

type EditingState = null | {
  id: string;
  isParent: boolean;
  name: string;
  bgColor: string;
  childrenBgColor: string;
};

export default function CategoriesPage({
  apiBase,
  title,
}: {
  apiBase: string;
  title: string;
}) {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editMode, setEditMode] = useState(false);

  const [newParentName, setNewParentName] = useState('');
  const [parentBgColor, setParentBgColor] = useState('#111827');
  const [parentChildrenBgColor, setParentChildrenBgColor] = useState('#374151');

  const [selectedParentId, setSelectedParentId] = useState('');
  const [newChildName, setNewChildName] = useState('');

  const [editing, setEditing] = useState<EditingState>(null);

  const selectedParent = useMemo(
    () => tree.find((c) => c.id === selectedParentId) || null,
    [tree, selectedParentId]
  );

  async function loadTree() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}?tree=1`);
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json().catch(() => []);
      setTree(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar las categorías.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  async function createParent(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const name = newParentName.trim();
    if (!name) return setError('El nombre de la categoría es obligatorio.');

    const res = await fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        bgColor: parentBgColor,
        childrenBgColor: parentChildrenBgColor,
      }),
    });

    if (!res.ok) return setError(await readApiError(res));

    setNewParentName('');
    toast.success('Categoría creada');
    await loadTree();
  }

  async function createChild(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const name = newChildName.trim();
    if (!selectedParentId) return setError('Elegí una categoría padre.');
    if (!name) return setError('El nombre de la subcategoría es obligatorio.');

    const res = await fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId: selectedParentId }),
    });

    if (!res.ok) return setError(await readApiError(res));

    setNewChildName('');
    toast.success('Subcategoría creada');
    await loadTree();
  }

  function openEditParent(parent: CategoryNode) {
    setEditing({
      id: parent.id,
      isParent: true,
      name: parent.name,
      bgColor: parent.bgColor ?? '#111827',
      childrenBgColor: parent.childrenBgColor ?? '#374151',
    });
  }

  function openEditChild(child: CategoryNode, parent: CategoryNode) {
    setEditing({
      id: child.id,
      isParent: false,
      name: child.name,
      bgColor: child.bgColor ?? parent.childrenBgColor ?? '#374151',
      childrenBgColor: parent.childrenBgColor ?? '#374151',
    });
  }

  async function saveEdit() {
    if (!editing) return;

    const name = editing.name.trim();
    if (!name) {
      const msg = 'El nombre es obligatorio.';
      setError(msg);
      toast.error(msg);
      return;
    }

    const payload: any = { id: editing.id, name };

    if (editing.isParent) {
      payload.bgColor = editing.bgColor;
      payload.childrenBgColor = editing.childrenBgColor;
    }

    const res = await fetch(apiBase, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError(await readApiError(res));
      return;
    }

    setEditing(null);
    toast.success(
      editing.isParent ? 'Categoría actualizada' : 'Subcategoría actualizada'
    );
    await loadTree();
  }

  async function deleteCategory(id: string, label: string) {
    const result = await Swal.fire({
      title: '¿Eliminar?',
      text: label,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    const res = await fetch(`${apiBase}?id=${id}`, { method: 'DELETE' });

    if (!res.ok) {
      toast.error(await readApiError(res));
      return;
    }

    toast.success('Categoría eliminada');
    await loadTree();
  }

  return (
    <main className="space-y-6">
      {error ? (
        <div className="mb-4 text-sm text-red-500 border border-red-500/30 rounded p-3">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="font-semibold mb-3">Nueva categoría</h2>

          <form onSubmit={createParent} className="grid gap-3">
            <input
              value={newParentName}
              onChange={(e) => setNewParentName(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10"
              placeholder="Ej: Supermercado"
            />

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm">Color categoría</label>
                <input
                  type="color"
                  value={parentBgColor}
                  onChange={(e) => setParentBgColor(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm">Color subcategorías</label>
                <input
                  type="color"
                  value={parentChildrenBgColor}
                  onChange={(e) => setParentChildrenBgColor(e.target.value)}
                />
              </div>
            </div>

            <button
              className="bg-blue-600 text-white px-4 py-2 font-bold rounded"
              type="submit"
            >
              Crear
            </button>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold mb-3">Nueva subcategoría</h2>

          <form onSubmit={createChild} className="grid gap-3">
            <select
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
            >
              <option value="">Elegí categoría padre...</option>
              {tree.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <input
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
              placeholder={
                selectedParent
                  ? `Subcategoría para ${selectedParent.name}`
                  : 'Ej: Verdulería'
              }
              disabled={!selectedParentId}
            />

            <button
              className="bg-blue-600 text-white px-4 py-2 font-bold rounded disabled:opacity-60"
              type="submit"
              disabled={!selectedParentId}
            >
              Crear subcategoría
            </button>
          </form>
        </section>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-bold">{title}</h1>

          <button
            className={`px-4 py-2 rounded text-white font-bold transition-colors ${
              editMode
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? 'SALIR DE LA EDICIÓN' : 'EDITAR'}
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-[var(--muted)]">Cargando...</div>
        ) : tree.length === 0 ? (
          <div className="text-sm text-[var(--muted)]">No hay categorías.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tree.map((parent) => {
              const chipsBg = parent.childrenBgColor ?? '#374151';

              return (
                <div
                  key={parent.id}
                  className={`card p-4 relative transition-all duration-200 ${
                    editMode
                      ? 'ring-2 ring-blue-500/40 cursor-pointer hover:shadow-md'
                      : 'cursor-default'
                  }`}
                  onClick={() => {
                    if (editMode) openEditParent(parent);
                  }}
                >
                  {editMode ? (
                    <button
                      className="absolute top-3 right-3 text-sm px-2 py-1 rounded bg-black/25 hover:bg-black/35 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(
                          parent.id,
                          `${parent.name} (y sus subcategorías)`
                        );
                      }}
                    >
                      🗑️
                      <span className="pointer-events-none absolute right-0 mt-2 translate-y-1 opacity-0 group-hover:opacity-100 transition text-xs bg-black/70 text-white px-2 py-1 rounded">
                        Eliminar
                      </span>
                    </button>
                  ) : null}

                  <div
                    className="font-semibold text-lg mb-3 px-3 py-1 rounded inline-block"
                    style={{
                      backgroundColor: parent.bgColor ?? '#111827',
                      color: textColorForBg(parent.bgColor),
                    }}
                  >
                    {parent.name}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(parent.children ?? []).map((child) => {
                      const chipBg = child.bgColor ?? chipsBg;
                      const chipText = textColorForBg(chipBg);

                      return (
                        <span
                          key={child.id}
                          className="text-sm px-3 py-1 rounded-full inline-flex items-center gap-2"
                          style={{ backgroundColor: chipBg, color: chipText }}
                        >
                          {child.name}

                          {editMode ? (
                            <>
                              <button
                                className="text-xs opacity-80 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditChild(child, parent);
                                }}
                                title="Editar subcategoría"
                              >
                                ✏️
                              </button>

                              <button
                                className="text-xs opacity-80 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCategory(child.id, child.name);
                                }}
                                title="Eliminar subcategoría"
                              >
                                🗑️
                              </button>
                            </>
                          ) : null}
                        </span>
                      );
                    })}

                    {(parent.children ?? []).length === 0 ? (
                      <span className="text-sm opacity-80">
                        Sin subcategorías
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editing ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] p-5">
            <h3 className="font-semibold text-lg mb-3">
              {editing.isParent ? 'Editar categoría' : 'Editar subcategoría'}
            </h3>

            <div className="grid gap-3">
              <div>
                <label className="text-sm">Nombre</label>
                <input
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] outline-none focus:ring-2 focus:ring-white/10"
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </div>

              {editing.isParent ? (
                <>
                  <div className="flex items-center gap-3">
                    <label className="text-sm w-40">Color categoría</label>
                    <input
                      type="color"
                      value={editing.bgColor}
                      onChange={(e) =>
                        setEditing({ ...editing, bgColor: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm w-40">Color subcategorías</label>
                    <input
                      type="color"
                      value={editing.childrenBgColor}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          childrenBgColor: e.target.value,
                        })
                      }
                    />
                  </div>

                  <p className="text-xs text-gray-300">
                    Cambiar el color de subcategorías actualiza el color de
                    todos los chips de esa categoría.
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-300">
                  El color de subcategorías se define en la categoría padre.
                </p>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <button
                  className="px-4 py-2 rounded-md border border-[var(--border)] hover:bg-white/5 transition"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>

                <button
                  className="px-4 py-2 rounded-md border border-[var(--border)] bg-white/10 hover:bg-white/15 transition"
                  onClick={saveEdit}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
