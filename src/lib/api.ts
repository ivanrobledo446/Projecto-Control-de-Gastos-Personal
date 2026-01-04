export async function readApiError(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => ({}));
    return (data as any)?.error || `HTTP ${res.status}`;
  }
  const text = await res.text().catch(() => '');
  return text || `HTTP ${res.status}`;
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(await readApiError(res));
  return (await res.json()) as T;
}
