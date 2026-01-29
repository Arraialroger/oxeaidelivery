/**
 * Phone number formatting and validation utilities
 * Used across Checkout, Auth, Account, and Kitchen pages
 */

/**
 * Format phone to Brazilian format: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  const limited = numbers.slice(0, 11);

  if (limited.length <= 2) {
    return limited.length > 0 ? `(${limited}` : "";
  }
  if (limited.length <= 6) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  }
  if (limited.length <= 10) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
};

/**
 * Get only digits from formatted phone
 */
export const getPhoneDigits = (value: string): string => {
  return value.replace(/\D/g, "");
};

/**
 * Validate Brazilian phone (10 or 11 digits)
 */
export const isValidPhone = (value: string): boolean => {
  const digits = getPhoneDigits(value);
  return digits.length >= 10 && digits.length <= 11;
};

/**
 * Format phone for display (from raw digits)
 */
export const formatPhoneDisplay = (value: string | undefined | null): string | null => {
  if (!value) return null;
  const clean = value.replace(/\D/g, "");
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return value;
};

/**
 * Format phone number into WhatsApp link
 */
export const formatWhatsAppLink = (phone: string | undefined | null): string | null => {
  if (!phone) return null;
  // Remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, "");
  // Add Brazil country code if not present
  const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${fullPhone}`;
};
