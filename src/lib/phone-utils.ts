
export function formatPhoneNumberForWhatsapp(phoneNumber: string, countryCode?: string): string | null {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let digitsOnly = phoneNumber.replace(/\D/g, '');
  
  if (!countryCode) {
    // If no country code, assume it's included or it's a local number we can't process
    return digitsOnly;
  }
  
  const countryCodeDigits = countryCode.replace(/\D/g, '');

  if (digitsOnly.startsWith(countryCodeDigits)) {
    // Phone number already has country code
    return digitsOnly;
  }
  
  // If number starts with 0, remove it before adding country code
  if (digitsOnly.startsWith('0')) {
    digitsOnly = digitsOnly.substring(1);
  }
  
  return `${countryCodeDigits}${digitsOnly}`;
}
