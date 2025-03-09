/**
 * Returns true if the given number is odd
 * @param {number} value - The number to check
 * @returns {boolean} True if the number is odd, false otherwise
 */
module.exports = function isOdd(value) {
  if (typeof value !== 'number') {
    throw new TypeError('Expected a number');
  }
  
  // Convert to integer
  const num = Math.abs(Math.round(value));
  return (num % 2) === 1;
};
