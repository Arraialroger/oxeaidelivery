/**
 * Application constants
 * Replaces magic numbers with named constants for clarity
 */

// Loyalty program
export const STAMP_EXPIRATION_DAYS = 180;
export const DEFAULT_STAMPS_GOAL = 8;
export const DEFAULT_MIN_ORDER = 50;
export const DEFAULT_REWARD_VALUE = 50;

// Kitchen / KDS
export const URGENT_ORDER_MINUTES = 10;
export const KDS_MAX_ACTIVE_ORDERS = 50;
export const KDS_HISTORY_LIMIT = 50;

// Push notifications
export const PUSH_TTL_SECONDS = 3600;
export const PUSH_SUBSCRIPTION_EXPIRY_HOURS = 24;

// Cart
export const CART_DEBOUNCE_MS = 500;

// Phone validation
export const PHONE_MIN_DIGITS = 10;
export const PHONE_MAX_DIGITS = 11;

// Image URL validation
export const ALLOWED_IMAGE_PROTOCOLS = ["https:"];
