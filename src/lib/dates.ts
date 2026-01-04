export function todayAsInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isoDateToInputValue(iso: string) {
  return iso.slice(0, 10);
}

export function toLocalDate(isoOrDate: string) {
  const ymd = (isoOrDate ?? '').slice(0, 10); // "YYYY-MM-DD"
  const [yyyy, mm, dd] = ymd.split('-');
  if (!yyyy || !mm || !dd) return '';
  return `${dd}/${mm}/${yyyy}`;
}
