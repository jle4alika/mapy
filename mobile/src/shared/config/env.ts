export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8001').replace(/\/$/, '');

export const API_V1 = `${API_BASE_URL}/api/v1`;

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // Абсолютные URL с /media/ (часто localhost:8000 из STORAGE_PUBLIC_BASE_URL)
  // всегда отдаём через актуальный API_BASE_URL.
  const mediaIdx = path.indexOf('/media/');
  if (mediaIdx >= 0) {
    return `${API_BASE_URL}${path.slice(mediaIdx)}`;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function wsGatewayUrl(token: string): string {
  const base = API_BASE_URL.replace(/^http/, 'ws');
  return `${base}/api/v1/ws/gateway?token=${encodeURIComponent(token)}`;
}
