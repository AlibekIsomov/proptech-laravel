export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function initData(): string {
  return window.Telegram?.WebApp?.initData ?? '';
}

/** Mahalla Fix boti uchun alohida API client (o'z prefiksi va bot initData'si). */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`/mahalla-fix/api${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Accept: 'application/json',
      Authorization: `tma ${initData()}`,
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, (body as { message?: string }).message || 'Xatolik yuz berdi');
  }

  return body as T;
}
