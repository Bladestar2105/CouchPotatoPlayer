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
