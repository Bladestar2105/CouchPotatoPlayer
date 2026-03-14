## 2026-03-14 - Added security headers in Nginx configuration
**Vulnerability:** Missing fundamental security headers (X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, Referrer-Policy) in Nginx reverse proxy configuration for the web UI.
**Learning:** When configuring a custom Nginx reverse proxy, standard security headers are not included by default and must be explicitly added to protect the web client against Clickjacking, MIME sniffing, and cross-site scripting attacks.
**Prevention:** Always enforce a baseline set of security headers for HTTP server location blocks serving web applications.
