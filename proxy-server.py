#!/usr/bin/env python3
"""
Simple CORS proxy server for development purposes.
Run this alongside the web app to bypass CORS restrictions.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import sys

ALLOWED_ORIGINS = [
    'http://localhost:8081', # Expo web development
    'http://localhost:8082', # Alternative development port
    'http://localhost:3000', # Common React dev port
    'http://localhost'      # Nginx/Docker default
]

class CORSProxyHandler(BaseHTTPRequestHandler):
    def get_cors_origin(self):
        origin = self.headers.get('Origin')
        if origin in ALLOWED_ORIGINS:
            return origin
        return ""

    def do_GET(self):
        if self.path.startswith('/proxy/'):
            url = self.path[7:]  # Remove '/proxy/' prefix

            # SSRF mitigation: Only proxy http and https schemes
            if not url.startswith('http://') and not url.startswith('https://'):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid URL scheme. Must be http:// or https://"}')
                return

            try:
                req = urllib.request.Request(url)
                req.add_header('User-Agent', 'Mozilla/5.0')
                with urllib.request.urlopen(req, timeout=30) as response:
                    self.send_response(200)
                    cors_origin = self.get_cors_origin()
                    if cors_origin:
                        self.send_header('Access-Control-Allow-Origin', cors_origin)
                    self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range')
                    content_type = response.headers.get('Content-Type', 'application/octet-stream')
                    self.send_header('Content-Type', content_type)
                    self.end_headers()
                    self.wfile.write(response.read())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Proxy error occurred"}')
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        cors_origin = self.get_cors_origin()
        if cors_origin:
            self.send_header('Access-Control-Allow-Origin', cors_origin)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range')
        self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[PROXY] {args[0]}", file=sys.stderr)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9000
    server = HTTPServer(('0.0.0.0', port), CORSProxyHandler)
    print(f"CORS Proxy server running on port {port}")
    server.serve_forever()