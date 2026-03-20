#!/usr/bin/env python3
"""
Simple CORS proxy server for development purposes.
Run this alongside the web app to bypass CORS restrictions.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import sys

class CORSProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/proxy/'):
            url = self.path[7:]  # Remove '/proxy/' prefix
            try:
                req = urllib.request.Request(url)
                req.add_header('User-Agent', 'Mozilla/5.0')
                with urllib.request.urlopen(req, timeout=30) as response:
                    self.send_response(200)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', '*')
                    content_type = response.headers.get('Content-Type', 'application/octet-stream')
                    self.send_header('Content-Type', content_type)
                    self.end_headers()
                    self.wfile.write(response.read())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}'.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[PROXY] {args[0]}", file=sys.stderr)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9000
    server = HTTPServer(('0.0.0.0', port), CORSProxyHandler)
    print(f"CORS Proxy server running on port {port}")
    server.serve_forever()