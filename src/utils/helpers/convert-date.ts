/*
    Converts an ISO date string (e.g., "2024-04-10T18:19:16.381Z") to a formatted date string (e.g., "4/10/2024").
*/
const convertDate = (isoDateStr: string): string => {
  const date = new Date(isoDateStr);

  const month = date.getUTCMonth() + 1; // months are zero-indexed

  const day = date.getUTCDate();

  const year = date.getUTCFullYear();

  return `${month}/${day}/${year}`;
};

export default convertDate;
