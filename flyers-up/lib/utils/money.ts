/**
 * Money Utility Functions
 * 
 * Helper functions for converting between dollars (display) and cents (storage).
 * All prices are stored in cents as integers to avoid floating-point precision issues.
 */

/**
 * Convert dollars (number or string) to cents (integer).
 * Handles decimal input like "19.99" or 19.99 -> 1999 cents.
 */
export function dollarsToCents(dollars: number | string): number {
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (isNaN(num)) {
    throw new Error(`Invalid dollar amount: ${dollars}`);
  }
  return Math.round(num * 100);
}

/**
 * Convert cents (integer) to dollars (number).
 * Example: 1999 cents -> 19.99 dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format cents as a currency string (e.g., "$19.99").
 * Always shows 2 decimal places.
 */
export function formatMoney(cents: number): string {
  const dollars = centsToDollars(cents);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Format cents as a simple dollar string without currency symbol (e.g., "19.99").
 * Useful for input fields or when you want to display just the number.
 */
export function formatDollars(cents: number): string {
  const dollars = centsToDollars(cents);
  return dollars.toFixed(2);
}








