import { API_V1 } from '../config/env';
import { ApiError, mapStatusToRussian, translateDetail } from './errors';
import { clearAccessToken, getAccessToken } from './token';

type RequestOptions = {
  method?: string;
  body?: unknown;
  form?: URLSearchParams | FormData;
  auth?: boolean;
  headers?: Record<string, string>;
  /** мс; для медиа можно больше */
  timeoutMs?: number;
};

async function parseDetail(res: Response): Promise<{ detail: string; code?: string }> {
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') {
      return { detail: translateDetail(data.detail), code: data.code };
    }
    if (Array.isArray(data?.detail)) {
      const msgs = data.detail
        .map((item: { msg?: string; type?: string }) => {
          if (item?.msg) return translateDetail(String(item.msg));
          return '';
        })
        .filter(Boolean);
      const unique = [...new Set(msgs)];
      return {
        detail: unique.join('. ') || mapStatusToRussian(res.status),
        code: data.code,
      };
    }
    if (typeof data?.message === 'string') {
      return { detail: translateDetail(data.message), code: data.code };
    }
  } catch {
    // ignore
  }
  return { detail: mapStatusToRussian(res.status) };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, form, auth = true, headers = {}, timeoutMs = 12_000 } = options;
  const finalHeaders: Record<string, string> = { ...headers };

  if (auth) {
    const token = await getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let payload: BodyInit | undefined;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      res = await fetch(`${API_V1}${path}`, {
        method,
        headers: finalHeaders,
        body: payload,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new ApiError(
      0,
      aborted
        ? 'Превышено время ожидания ответа сервера.'
        : 'Не удалось связаться с сервером. Проверьте интернет или что backend запущен.',
      aborted ? 'timeout' : 'network_error',
    );
  }

  if (res.status === 401 && auth) {
    await clearAccessToken();
    try {
      const { useSessionStore } = await import('../../features/auth/session-store');
      useSessionStore.setState({ token: null, user: null });
    } catch {
      // ignore circular import edge
    }
  }

  if (!res.ok) {
    const { detail, code } = await parseDetail(res);
    throw new ApiError(res.status, detail, code);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, 'Сервер вернул некорректный ответ.', 'invalid_json');
  }
}
