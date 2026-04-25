const sanitizeXtreamPath = (pathname: string): string => {
  const segments = pathname.split('/');
  if (segments.length < 4) return pathname;

  const resource = segments[1]?.toLowerCase();
  if (resource !== 'live' && resource !== 'movie' && resource !== 'series' && resource !== 'timeshift') {
    return pathname;
  }

  segments[2] = '***';
  segments[3] = '***';
  return segments.join('/');
};

export const sanitizeUrl = (urlStr: string): string => {
  if (!urlStr) return urlStr;
  try {
    const parsed = new URL(urlStr);
    if (parsed.searchParams.has('username')) parsed.searchParams.set('username', '***');
    if (parsed.searchParams.has('password')) parsed.searchParams.set('password', '***');
    if (parsed.searchParams.has('token')) parsed.searchParams.set('token', '***');
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    parsed.pathname = sanitizeXtreamPath(parsed.pathname);
    return parsed.toString();
  } catch {
    // Fallback if URL parsing fails (e.g. invalid URL or partial path)
    return urlStr
      .replace(/:\/\/([^/]+)@/g, '://***@')
      .replace(/(username|password|token)=([^&]+)/gi, '$1=***')
      .replace(/(\/(?:live|movie|series|timeshift)\/)([^/?#]+)\/([^/?#]+)/gi, '$1***/***');
  }
};

/**
 * Scrubs URLs with credentials out of anything a logger might receive — raw
 * strings, `Error` instances (message + stack), or plain objects carrying a
 * `.message` field. Returns a new object; the input is never mutated.
 *
 * Safe to call on non-string, non-error inputs: they are returned as-is.
 */
export const sanitizeError = (value: unknown): unknown => {
  if (value == null) return value;
  if (typeof value === 'string') return sanitizeUrl(value);
  if (value instanceof Error) {
    const sanitized = new Error(sanitizeUrl(value.message));
    sanitized.name = value.name;
    sanitized.stack = value.stack ? sanitizeUrl(value.stack) : undefined;
    return sanitized;
  }
  if (typeof value === 'object') {
    const maybeMessage = (value as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') {
      return { ...(value as Record<string, unknown>), message: sanitizeUrl(maybeMessage) };
    }
  }
  return value;
};
