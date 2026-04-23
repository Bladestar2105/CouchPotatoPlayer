import { describe, test, expect } from './bunTestCompat';
import { sanitizeUrl } from '../sanitizeUrl';

describe('sanitizeUrl', () => {
  test('should sanitize username and password in query parameters', () => {
    const url = 'http://example.com/api?username=myuser&password=mypassword&other=value';
    const sanitized = sanitizeUrl(url);
    expect(sanitized).toContain('username=***');
    expect(sanitized).toContain('password=***');
    expect(sanitized).toContain('other=value');
    expect(sanitized).not.toContain('myuser');
    expect(sanitized).not.toContain('mypassword');
  });

  test('should sanitize username and password in URL credentials', () => {
    const url = 'http://myuser:mypassword@example.com/api';
    const sanitized = sanitizeUrl(url);
    expect(sanitized).toBe('http://***:***@example.com/api');
    expect(sanitized).not.toContain('myuser');
    expect(sanitized).not.toContain('mypassword');
  });

  test('should sanitize token in query parameters', () => {
    const url = 'http://example.com/api?token=secret-token&other=value';
    const sanitized = sanitizeUrl(url);
    expect(sanitized).toContain('token=***');
    expect(sanitized).toContain('other=value');
    expect(sanitized).not.toContain('secret-token');
  });

  test('should sanitize xtream credentials in stream path segments', () => {
    const url = 'https://example.com/live/myuser/mypassword/123.ts';
    const sanitized = sanitizeUrl(url);
    expect(sanitized).toContain('/live/***/***/123.ts');
    expect(sanitized).not.toContain('myuser');
    expect(sanitized).not.toContain('mypassword');
  });

  test('fallback: should sanitize xtream credentials in malformed path strings', () => {
    const malformed = 'not-a-url /timeshift/myuser/mypassword/60/2026-04-20:19-00/123.ts';
    const sanitized = sanitizeUrl(malformed);
    expect(sanitized).toContain('/timeshift/***/***/60/2026-04-20:19-00/123.ts');
    expect(sanitized).not.toContain('myuser');
    expect(sanitized).not.toContain('mypassword');
  });

  test('fallback: should sanitize username, password, and token using regex', () => {
    // URL parsing might fail for some malformed inputs, but we still want to sanitize
    const malformed = 'not-a-url?username=myuser&password=mypassword&token=secret-token';
    const sanitized = sanitizeUrl(malformed);
    expect(sanitized).toContain('username=***');
    expect(sanitized).toContain('password=***');
    expect(sanitized).toContain('token=***');
    expect(sanitized).not.toContain('myuser');
    expect(sanitized).not.toContain('mypassword');
    expect(sanitized).not.toContain('secret-token');
  });
});
