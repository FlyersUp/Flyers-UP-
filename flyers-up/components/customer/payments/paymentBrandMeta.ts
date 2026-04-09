export const BRAND_DISPLAY: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

export function displayBrand(brand: string): string {
  const k = String(brand || 'card').toLowerCase();
  return BRAND_DISPLAY[k] ?? (brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Card');
}
