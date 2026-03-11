import { parseXmltvDate } from '../xmltv';

describe('parseXmltvDate', () => {
  it('should correctly parse a standard date with positive timezone', () => {
    // 2023-10-27 12:00:00 UTC+2 = 2023-10-27 10:00:00 UTC
    const dateStr = '20231027120000 +0200';
    const expected = Date.UTC(2023, 9, 27, 10, 0, 0);
    expect(parseXmltvDate(dateStr)).toBe(expected);
  });

  it('should correctly parse a standard date with negative timezone', () => {
    // 2023-10-27 12:00:00 UTC-5 = 2023-10-27 17:00:00 UTC
    const dateStr = '20231027120000 -0500';
    const expected = Date.UTC(2023, 9, 27, 17, 0, 0);
    expect(parseXmltvDate(dateStr)).toBe(expected);
  });

  it('should correctly parse a date without timezone', () => {
    const dateStr = '20231027120000';
    const expected = Date.UTC(2023, 9, 27, 12, 0, 0);
    expect(parseXmltvDate(dateStr)).toBe(expected);
  });

  it('should handle incomplete timezone (19 characters) gracefully', () => {
    // "20231027120000 +020" has length 19.
    const dateStr = '20231027120000 +020';
    const result = parseXmltvDate(dateStr);
    // If it fails with NaN, it might return 0 or NaN depending on how Date.UTC handles it.
    // We expect it to either ignore the timezone or handle it correctly.
    // Given the current bug, it will probably produce an invalid result.
    expect(Number.isNaN(result)).toBe(false);
  });

  it('should return 0 for short date strings', () => {
    expect(parseXmltvDate('20231027')).toBe(0);
  });

  it('should return 0 for empty strings', () => {
    expect(parseXmltvDate('')).toBe(0);
  });

  it('should return 0 for null or undefined (via casting)', () => {
    expect(parseXmltvDate(null as any)).toBe(0);
    expect(parseXmltvDate(undefined as any)).toBe(0);
  });
});
