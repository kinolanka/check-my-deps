import calculateTimeSinceRelease from '@/utils/helpers/calculate-time-since-release';

// Mock current date to have consistent test results
const mockDate = new Date('2025-03-15T00:00:00.000Z');

const realDate = global.Date;

describe('calculateTimeSinceRelease', () => {
  // Set up mock date before each test
  beforeEach(() => {
    global.Date = class extends Date {
      constructor(date?: string | number | Date) {
        if (date) {
          super(date);
        } else {
          super(mockDate);

          return mockDate;
        }
      }
    } as DateConstructor;
  });

  // Restore original Date after each test
  afterEach(() => {
    global.Date = realDate;
  });

  describe('with invalid inputs', () => {
    it('should return undefined for null input', () => {
      expect(calculateTimeSinceRelease(null as unknown as string)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(calculateTimeSinceRelease('')).toBeUndefined();
    });

    it('should return undefined for invalid date string', () => {
      expect(calculateTimeSinceRelease('not-a-date')).toBeUndefined();
    });
  });

  describe('with days as unit', () => {
    it('should calculate days correctly for a date 10 days ago', () => {
      const tenDaysAgo = new Date('2025-03-05T00:00:00.000Z');

      expect(calculateTimeSinceRelease(tenDaysAgo, 'days')).toBe(10);
    });

    it('should calculate days correctly for a date 1 day ago', () => {
      const oneDayAgo = new Date('2025-03-14T00:00:00.000Z');

      expect(calculateTimeSinceRelease(oneDayAgo, 'days')).toBe(1);
    });

    it('should return 0 for a future date', () => {
      const futureDays = new Date('2025-03-20T00:00:00.000Z');

      expect(calculateTimeSinceRelease(futureDays, 'days')).toBe(0);
    });

    it('should return 0 for the current date', () => {
      const currentDate = new Date('2025-03-15T00:00:00.000Z');

      expect(calculateTimeSinceRelease(currentDate, 'days')).toBe(0);
    });
  });

  describe('with months as unit', () => {
    it('should calculate months correctly for a date 3 months ago', () => {
      const threeMonthsAgo = new Date('2024-12-15T00:00:00.000Z');

      expect(calculateTimeSinceRelease(threeMonthsAgo, 'months')).toBe(3);
    });

    it('should calculate months correctly for a date 1 month ago', () => {
      const oneMonthAgo = new Date('2025-02-15T00:00:00.000Z');

      expect(calculateTimeSinceRelease(oneMonthAgo, 'months')).toBe(1);
    });

    it('should calculate months correctly when day of month is earlier', () => {
      const date = new Date('2024-09-20T00:00:00.000Z');

      expect(calculateTimeSinceRelease(date, 'months')).toBe(5);
    });

    it('should calculate months correctly when day of month is later', () => {
      const date = new Date('2024-09-10T00:00:00.000Z');

      expect(calculateTimeSinceRelease(date, 'months')).toBe(6);
    });

    it('should return 0 for a future date', () => {
      const futureMonths = new Date('2025-04-15T00:00:00.000Z');

      expect(calculateTimeSinceRelease(futureMonths, 'months')).toBe(0);
    });

    it('should use months as default unit when no unit is specified', () => {
      const threeMonthsAgo = new Date('2024-12-15T00:00:00.000Z');

      expect(calculateTimeSinceRelease(threeMonthsAgo)).toBe(3);
    });
  });

  describe('with years as unit', () => {
    it('should calculate years correctly for a date 2 years ago', () => {
      const twoYearsAgo = new Date('2023-03-15T00:00:00.000Z');

      expect(calculateTimeSinceRelease(twoYearsAgo, 'years')).toBe(2);
    });

    it('should calculate years correctly for a date 1 year ago', () => {
      const oneYearAgo = new Date('2024-03-15T00:00:00.000Z');

      expect(calculateTimeSinceRelease(oneYearAgo, 'years')).toBe(1);
    });

    it('should calculate years correctly when month is earlier but day is later', () => {
      const date = new Date('2023-02-20T00:00:00.000Z');

      expect(calculateTimeSinceRelease(date, 'years')).toBe(2);
    });

    it('should calculate years correctly when month is same but day is later', () => {
      const date = new Date('2024-03-20T00:00:00.000Z');

      expect(calculateTimeSinceRelease(date, 'years')).toBe(0);
    });

    it('should return 0 for a future date', () => {
      const futureYears = new Date('2026-03-15T00:00:00.000Z');

      expect(calculateTimeSinceRelease(futureYears, 'years')).toBe(0);
    });
  });

  describe('with string date input', () => {
    it('should handle ISO string date input correctly', () => {
      expect(calculateTimeSinceRelease('2024-03-15T00:00:00.000Z', 'years')).toBe(1);
    });

    it('should handle non-ISO string date input correctly', () => {
      expect(calculateTimeSinceRelease('March 15, 2024', 'years')).toBe(1);
    });
  });
});
