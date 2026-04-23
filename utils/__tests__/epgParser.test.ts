import { describe, test, expect } from './bunTestCompat';
import { _test_parseXMLDate as parseXMLDate } from '../epgParser';

describe('parseXMLDate', () => {
  test('should parse valid date without offset', () => {
    const timestamp = parseXMLDate('20231027123045');
    expect(typeof timestamp).toBe('number');
    const date = new Date(timestamp as number);
    expect(date.getUTCFullYear()).toBe(2023);
    expect(date.getUTCMonth()).toBe(9); // October
    expect(date.getUTCDate()).toBe(27);
    expect(date.getUTCHours()).toBe(12);
    expect(date.getUTCMinutes()).toBe(30);
    expect(date.getUTCSeconds()).toBe(45);
  });

  test('should parse valid date with positive offset', () => {
    // 2023-10-27 12:30:45 +0200 -> UTC 10:30:45
    const timestamp = parseXMLDate('20231027123045 +0200');
    const date = new Date(timestamp as number);
    expect(date.getUTCHours()).toBe(10);
  });

  test('should parse valid date with negative offset', () => {
    // 2023-10-27 12:30:45 -0500 -> UTC 17:30:45
    const timestamp = parseXMLDate('20231027123045 -0500');
    const date = new Date(timestamp as number);
    expect(date.getUTCHours()).toBe(17);
  });

  test('should return null for too short strings', () => {
    expect(parseXMLDate('2023102712304')).toBeNull();
  });

  test('should return null for invalid date strings (NaN)', () => {
    expect(parseXMLDate('invalidstring14')).toBeNull();
    expect(parseXMLDate('202310271230AA')).toBeNull();
  });

  test('should return null for logical but invalid dates', () => {
    // Month 13 is invalid
    expect(parseXMLDate('20231327123045')).toBeNull();
    // Day 32 is invalid
    expect(parseXMLDate('20231032123045')).toBeNull();
  });

  test('should handle numeric input by converting to string', () => {
    // Some XML parsers might pass numbers if not configured
    const timestamp = parseXMLDate(20231027123045);
    const date = new Date(timestamp as number);
    expect(date.getUTCFullYear()).toBe(2023);
  });
});
