export function parseMoney(value: string | number) {
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function formatMoneyARS(n: number) {
  return `$${n.toLocaleString('es-AR')}`;
}