/**
 * Calculates the time difference between the current date and a given date.
 * If the difference is less than the specified unit, returns 0.
 *
 * @param dateInput - The date string or Date object to calculate difference from
 * @param unit - The time unit to calculate difference in ('days', 'months', or 'years'), defaults to 'months'
 * @returns Number of time units between current date and the given date, or undefined if date is invalid
 */
const calculateTimeSinceRelease = (
  dateInput: string | Date,
  unit: 'days' | 'months' | 'years' = 'months'
): number | undefined => {
  if (!dateInput) {
    return undefined;
  }

  // Handle both string and Date input types
  const releaseDate = dateInput instanceof Date ? dateInput : new Date(dateInput);

  // Check if the date is valid
  if (isNaN(releaseDate.getTime())) {
    return undefined;
  }

  // Get current date
  const currentDate = new Date();

  let difference: number;

  switch (unit) {
    case 'days':
      // Calculate difference in days
      difference = Math.floor(
        (currentDate.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      break;

    case 'years':
      // Calculate difference in years
      difference =
        currentDate.getFullYear() -
        releaseDate.getFullYear() -
        (currentDate.getMonth() < releaseDate.getMonth() ||
        (currentDate.getMonth() === releaseDate.getMonth() &&
          currentDate.getDate() < releaseDate.getDate())
          ? 1
          : 0);

      break;

    default:
      // Calculate difference in months
      difference =
        (currentDate.getFullYear() - releaseDate.getFullYear()) * 12 +
        (currentDate.getMonth() - releaseDate.getMonth()) -
        (currentDate.getDate() < releaseDate.getDate() ? 1 : 0);

      break;
  }

  // Return 0 if negative difference, otherwise return the difference
  return difference < 0 ? 0 : difference;
};

export default calculateTimeSinceRelease;
