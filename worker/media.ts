export function mediaUrl(key?: string | null, fallback?: string | null): string {
  if (key) return `/api/media/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  return fallback || '';
}
