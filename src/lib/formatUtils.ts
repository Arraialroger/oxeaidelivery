/**
 * Shared formatting utilities
 * Used across multiple components to avoid duplication
 */

/**
 * Format price to Brazilian currency (R$)
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

// Alias for formatPrice (used in checkout components)
export const formatCurrency = formatPrice;

/**
 * Format date to Brazilian format with time
 */
export const formatDateTime = (dateString: string): string => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
};

/**
 * Format date only (no time)
 */
export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
};

/**
 * Format currency input (for troco/change fields)
 */
export const formatCurrencyInput = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, "");

  if (!numbers) return "";

  // Convert to number (in cents) and format
  const cents = parseInt(numbers, 10);
  const reais = cents / 100;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(reais);
};

/**
 * Get numeric value from formatted currency
 */
export const getCurrencyValue = (value: string): number => {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return 0;
  return parseInt(numbers, 10) / 100;
};

/**
 * Validate price is a valid positive number
 */
export const isValidPrice = (value: string): boolean => {
  const price = parseFloat(value);
  return !isNaN(price) && price >= 0;
};

/**
 * Validate URL is HTTPS
 */
export const isValidHttpsUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional field)
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};
