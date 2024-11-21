import convertDate from './convert-date';

describe('convertDate', () => {
  test('should convert ISO date string to formatted date string', () => {
    expect(convertDate('2024-04-10T18:19:16.381Z')).toBe('4/10/2024');
    expect(convertDate('2023-01-01T00:00:00.000Z')).toBe('1/1/2023');
    expect(convertDate('2022-12-31T23:59:59.999Z')).toBe('12/31/2022');
  });

  test('should handle invalid date strings gracefully', () => {
    expect(convertDate('invalid-date')).toBe('NaN/NaN/NaN');
  });
});
