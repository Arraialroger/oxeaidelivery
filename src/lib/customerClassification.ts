/**
 * Classifies customer type based on phone area code
 * DDD 73 = Local (Morador), otherwise Tourist (Turista)
 * 
 * CRITICAL: This is wrapped in try-catch and NEVER blocks checkout
 */
export function classifyCustomerType(phone: string): 'local' | 'tourist' {
  try {
    // Normalize phone: remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Check for DDD 73 in various formats:
    // - Starts with 73 (e.g., "73999999999")
    // - Starts with 5573 (e.g., "+5573999999999")
    // - Starts with 073 (e.g., "073999999999")
    
    if (
      digits.startsWith('73') ||
      digits.startsWith('5573') ||
      digits.startsWith('073')
    ) {
      return 'local';
    }
    
    return 'tourist';
  } catch (error) {
    // SAFETY: If classification fails for any reason, default to tourist
    console.warn('[CustomerClassification] Error classifying customer, defaulting to tourist:', error);
    return 'tourist';
  }
}
