const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 9001;

const ALLOWED_ORIGINS = [
  'http://localhost:8081', // Expo web development
  'http://localhost:8082', // Alternative development port
  'http://localhost:3000', // Common React dev port
  'http://localhost'      // Nginx/Docker default
];

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;

  // Set CORS headers
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // If no origin, it might be a direct request (not from a browser)
    // We can still set a default or just omit it.
    // For proxying we might want to allow it but not via CORS.
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url.startsWith('/proxy/')) {
    const targetUrl = req.url.substring(7);

    // SSRF mitigation: Only proxy http and https schemes
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid URL scheme. Must be http:// or https://' }));
      return;
    }

    try {
      const u = new URL(targetUrl);
      if (u.searchParams.has('username')) u.searchParams.set('username', '***');
      if (u.searchParams.has('password')) u.searchParams.set('password', '***');
      if (u.username) u.username = '***';
      if (u.password) u.password = '***';
      console.log('Proxying:', u.toString());
    } catch (e) {
      const masked = targetUrl
        .replace(/:\/\/([^/]+)@/g, '://***@')
        .replace(/([?&])(username|password)=([^&]*)/gi, '$1$2=***');
      console.log('Proxying:', masked);
    }
    
    const { URL } = require('url');
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e) {
      console.error('Proxy error: Invalid URL', e.message);
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid URL provided' }));
      return;
    }
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const proxyReq = protocol.request(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (e) => {
      // Prevent logging sensitive credentials via error messages
      const maskedError = e.message
        .replace(/:\/\/([^/]+)@/g, '://***@')
        .replace(/([?&])(username|password)=([^&]*)/gi, '$1$2=***');
      console.error('Proxy error:', maskedError);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Proxy error occurred' }));
    });
    
    req.pipe(proxyReq);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CORS Proxy server running on port ${PORT}`);
});