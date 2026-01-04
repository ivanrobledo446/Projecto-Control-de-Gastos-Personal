export function textColorForBg(hex?: string | null) {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return '#111827';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}

export async function readApiError(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => ({}));
    return (data as any)?.error || `HTTP ${res.status}`;
  }
  const text = await res.text().catch(() => '');
  return text || `HTTP ${res.status}`;
}
