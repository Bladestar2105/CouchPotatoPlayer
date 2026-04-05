#!/usr/bin/env python3
"""
Simple CORS proxy server for development purposes.
Run this alongside the web app to bypass CORS restrictions.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import sys
import re
import socket
import ipaddress
import json

ALLOWED_ORIGINS = [
    'http://localhost:8081', # Expo web development
    'http://localhost:8082', # Alternative development port
    'http://localhost:3000', # Common React dev port
    'http://localhost'      # Nginx/Docker default
]

DISALLOWED_IPS = [
    '127.0.0.0/8',    # Loopback
    '10.0.0.0/8',     # Private-use (RFC 1918)
    '172.16.0.0/12',  # Private-use (RFC 1918)
    '192.168.0.0/16', # Private-use (RFC 1918)
    '169.254.0.0/16', # Link-local
    '::1/128',        # IPv6 loopback
    'fc00::/7',       # IPv6 Unique Local Address
    'fe80::/10',      # IPv6 link-local
]

class CORSProxyHandler(BaseHTTPRequestHandler):
    def is_safe_url(self, url):
        try:
            parsed = urllib.parse.urlparse(url)
            if parsed.scheme not in ('http', 'https'):
                return False, "Invalid URL scheme. Must be http:// or https://"

            hostname = parsed.hostname
            if not hostname:
                return False, "Invalid hostname"

            # Resolve all IP addresses for the hostname
            try:
                addr_info = socket.getaddrinfo(hostname, parsed.port or (80 if parsed.scheme == 'http' else 443))
            except socket.gaierror:
                return False, f"Could not resolve hostname: {hostname}"

            for family, _, _, _, sockaddr in addr_info:
                ip_str = sockaddr[0]
                ip = ipaddress.ip_address(ip_str)

                for disallowed in DISALLOWED_IPS:
                    if ip in ipaddress.ip_network(disallowed):
                        return False, f"Access to disallowed IP range: {ip_str}"

            return True, None
        except Exception as e:
            return False, f"URL validation error: {str(e)}"

    def get_cors_origin(self):
        origin = self.headers.get('Origin')
        if origin in ALLOWED_ORIGINS:
            return origin
        return ""

    def do_GET(self):
        cors_origin = self.get_cors_origin()
        if not cors_origin:
            self.send_response(403)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Origin not allowed"}).encode())
            return

        if self.path.startswith('/proxy/'):
            url = self.path[7:]  # Remove '/proxy/' prefix

            is_safe, error_msg = self.is_safe_url(url)
            if not is_safe:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": error_msg}).encode())
                return

            try:
                req = urllib.request.Request(url)
                req.add_header('User-Agent', 'Mozilla/5.0')
                with urllib.request.urlopen(req, timeout=30) as response:
                    self.send_response(200)
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
                self.wfile.write(json.dumps({"error": f"Proxy error: {str(e)}"}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        cors_origin = self.get_cors_origin()
        if not cors_origin:
            self.send_response(403)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Origin not allowed"}).encode())
            return

        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', cors_origin)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range')
        self.end_headers()
    
    def log_message(self, format, *args):
        message = str(args[0])

        try:
            # Safely mask URL authority credentials, accounting for potential URL encoding
            # Matches :// followed by anything that isn't a slash, stopping at @
            masked_message = re.sub(r'(%3A|:)//([^/]+)(%40|@)', r'\1//***\3', message, flags=re.IGNORECASE)

            # Mask username and password query parameters directly on the raw string
            # We match the parameter name (URL encoded or not), =, and then consume
            # everything up to the next & (or %26) or space (or %20) which marks the HTTP boundary
            masked_message = re.sub(
                r'([?&]|%3F|%26)(username|password)(%3D|=)([^& \s]|%20|%26)*',
                r'\g<1>\g<2>\g<3>***',
                masked_message,
                flags=re.IGNORECASE
            )

            # Prevent CRLF log injection by stripping raw newlines if any exist in the raw string
            safe_message = masked_message.replace('\r', '').replace('\n', '')

            print(f"[PROXY] {safe_message}", file=sys.stderr)
        except Exception:
            # Fallback to a generic message if parsing/masking completely fails to prevent crash
            print("[PROXY] <Request Log Masking Failed>", file=sys.stderr)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9000
    server = HTTPServer(('0.0.0.0', port), CORSProxyHandler)
    print(f"CORS Proxy server running on port {port}")
    server.serve_forever()