/**
 * Classifies customer type based on phone area code
 * DDD 73 = Local (Morador), otherwise Tourist (Turista)
 * 
 * CRITICAL: This is wrapped in try-catch and NEVER blocks checkout
 */
export function classifyCustomerType(phone: string): 'local' | 'tourist' {
  try {
    // Safety check for null/undefined
    if (!phone) {
      console.warn('[CustomerClassification] Phone is empty, defaulting to tourist');
      return 'tourist';
    }

    // 1. Sanitize: Remove ALL non-numeric characters (spaces, parenthesis, dashes, plus sign)
    const cleanPhone = phone.toString().replace(/\D/g, '');
    
    console.log('[CustomerClassification] Original phone:', phone);
    console.log('[CustomerClassification] Clean phone:', cleanPhone);

    // 2. Logic: Check for Area Code 73 (with or without Country Code 55)
    // Check if it starts exactly with "73" OR "5573"
    if (cleanPhone.startsWith('73') || cleanPhone.startsWith('5573')) {
      console.log('[CustomerClassification] Matched DDD 73 -> local');
      return 'local';
    }
    
    console.log('[CustomerClassification] No match -> tourist');
    return 'tourist';
  } catch (error) {
    // SAFETY: If classification fails for any reason, default to tourist
    console.warn('[CustomerClassification] Error classifying customer, defaulting to tourist:', error);
    return 'tourist';
  }
}
