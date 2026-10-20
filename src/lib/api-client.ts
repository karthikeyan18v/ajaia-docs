// Browser-side fetch helper: always resolves, never throws, so every caller
// handles failure explicitly.
export type ApiError = {
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
  [key: string]: unknown;
};

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; error: ApiError };

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<ApiResult<T>> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    return {
      ok: false,
      error: { status: 0, code: 'NETWORK', message: 'Can’t reach the server. Check your connection.' },
    };
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.ok) return { ok: true, status: res.status, data: body as T };
  const err = body?.error ?? {};
  return {
    ok: false,
    error: {
      ...err,
      status: res.status,
      code: err.code ?? 'INTERNAL',
      message: err.message ?? 'Something went wrong. Please try again.',
    },
  };
}

// Only allow same-site relative redirects after sign-in.
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
