/**
 * Formats a date string or Date object to the format 'month/date/fullyear' with leading zeros for month and date when less than 10.
 * @param dateInput - The date string or Date object to format
 * @returns Formatted date string in the format 'MM/DD/YYYY'
 */
const formatDate = (dateInput: string | Date): string => {
  if (!dateInput) {
    return '';
  }

  // Handle both string and Date input types
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return '';
  }

  // Get month (add 1 as months are zero-indexed) and add leading zero if needed
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');

  // Get day and add leading zero if needed
  const day = date.getUTCDate().toString().padStart(2, '0');

  // Get full year
  const year = date.getUTCFullYear();

  return `${month}/${day}/${year}`;
};

export default formatDate;
