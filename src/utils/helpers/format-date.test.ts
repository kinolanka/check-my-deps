import formatDate from '@/utils/helpers/format-date';

describe('formatDate', () => {
  it('should format date string with time part correctly', () => {
    expect(formatDate('2023-01-05T12:30:45.000Z')).toBe('01/05/2023');
  });

  it('should format date string without time part correctly', () => {
    expect(formatDate('2023-01-05')).toBe('01/05/2023');
  });

  it('should add leading zeros for month and day when less than 10', () => {
    expect(formatDate('2023-01-05')).toBe('01/05/2023');

    expect(formatDate('2023-10-05')).toBe('10/05/2023');

    expect(formatDate('2023-01-10')).toBe('01/10/2023');

    expect(formatDate('2023-10-10')).toBe('10/10/2023');
  });

  it('should return empty string for invalid date', () => {
    expect(formatDate('invalid-date')).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('should handle Date object input', () => {
    const dateObj = new Date('2023-05-10T15:30:00.000Z');

    expect(formatDate(dateObj)).toBe('05/10/2023');
  });

  it('should handle Date object for single-digit month and day', () => {
    const dateObj = new Date('2023-01-05T15:30:00.000Z');

    expect(formatDate(dateObj)).toBe('01/05/2023');
  });
});
