## 2024-03-11 - [Restrict Proxy Target Schemes to Prevent SSRF/LFI]
**Vulnerability:** The Nginx reverse proxy configuration (`nginx.conf`) allowed capturing any arbitrary URI scheme via the regex `(.*)` for the target proxy URL (e.g. `/proxy/file:///etc/passwd`). This introduces critical SSRF (Server-Side Request Forgery) and LFI (Local File Inclusion) risks.
**Learning:** Open proxy endpoints must strictly validate user-provided URLs. Even internal proxy paths used to bypass CORS can be abused to access internal systems or read local files if not properly sanitized to web protocols.
**Prevention:** Always restrict proxy targets to expected web protocols (`http://` or `https://`) directly in the matching configuration or code, such as updating the regex to `(https?://.*)`.

## 2026-03-11 - [Restrict CORS Origin in Proxy]
**Vulnerability:** Use of wildcard `Access-Control-Allow-Origin: *` in the Nginx proxy allowed any website to use the proxy to access IPTV APIs and streams, potentially leaking credentials or sensitive media data.
**Learning:** Wildcard CORS is dangerous for proxies that handle sensitive data. Origins should be whitelisted. When using dynamic origins, the `Vary: Origin` header is required for correct caching.
**Prevention:** Whitelist specific origins (like localhost and the application's own host) for CORS and ensure `Vary: Origin` is set when reflecting the origin in headers.

## 2026-03-12 - [Insecure Randomness for Room ID Generation]
**Vulnerability:** The `generateRoomId` function used `Math.random()` to generate Watch Party room codes. `Math.random()` is not cryptographically secure, making it theoretically possible for an attacker to predict future room IDs and join private watch parties unauthorized.
**Learning:** For identifiers that require a degree of unguessability or security, standard PRNGs like `Math.random()` are insufficient. Cryptographically Secure Pseudo-Random Number Generators (CSPRNG) must be used.
**Prevention:** Use `crypto.getRandomValues()` for generating random identifiers, tokens, or any data where predictability could lead to security compromises.