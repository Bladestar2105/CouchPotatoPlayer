## 2026-03-14 - Added security headers in Nginx configuration
**Vulnerability:** Missing fundamental security headers (X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, Referrer-Policy) in Nginx reverse proxy configuration for the web UI.
**Learning:** When configuring a custom Nginx reverse proxy, standard security headers are not included by default and must be explicitly added to protect the web client against Clickjacking, MIME sniffing, and cross-site scripting attacks.
**Prevention:** Always enforce a baseline set of security headers for HTTP server location blocks serving web applications.
## 2026-03-14 - Prevented sensitive information leakage in UI error messages
**Vulnerability:** Directly exposing raw exception messages (e.g., from network requests or API failures) in the UI can leak internal application details, API endpoints, or even potentially sensitive variables directly to end-users.
**Learning:** In Flutter applications, UI `setState` error assignments should provide generic, user-friendly feedback. Raw errors should be logged internally (e.g., via `debugPrint`) for developer debugging without risking data exposure.
**Prevention:** Always sanitize UI error messages in `catch` blocks and use separate internal logging mechanisms for capturing stack traces and raw error outputs.
