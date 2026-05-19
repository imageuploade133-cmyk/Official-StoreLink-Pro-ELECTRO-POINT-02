
import type { DisplayProduct, Category } from './types';
import { convertToDateSafely } from './utils';

export const ensureNumber = (value: any, defaultValue: number = 0): number => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

export const getLowestVariantPrice = (variants: any[]): number => {
  const activeVariants = variants.filter(v => v.isActive !== false);
  if (activeVariants.length === 0) return 0;
  return Math.min(...activeVariants.map(v => ensureNumber(v.sellingPrice || v.price, 0)));
};

export const getVariantPriceRange = (variants: any[]): { min: number, max: number } | null => {
  const activeVariants = variants.filter(v => v.isActive !== false);
  if (activeVariants.length === 0) return null;
  const prices = activeVariants.map(v => ensureNumber(v.sellingPrice || v.price, 0));
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
};

/**
 * Pricing Engine logic to determine the active price for a product.
 * Hierarchy:
 * 1. Individual Product Sale (ACTIVE): If category.allowIndividualProductSales is ON, product promo takes priority.
 * 2. Global Flash Sale (ACTIVE): Applied to all products not handled by Step 1.
 * 3. Manual New Price (Discount): Optional direct discount price set manually.
 * 4. Base Selling Price: Default if no active promos match.
 */
export const calculateEffectivePrice = (
  product: DisplayProduct,
  today: Date | null,
  category?: Category | null
): number => {
  const baseSellingPrice = ensureNumber(product.sellingPrice, 0);
  const manualNewPrice = product.newPrice != null ? ensureNumber(product.newPrice, 0) : null;

  // --- Step 0: Check for Manual New Price (Direct Discount) ---
  // If manual newPrice is set and is less than base price, use it
  if (manualNewPrice !== null && manualNewPrice < baseSellingPrice && manualNewPrice > 0) {
    return manualNewPrice;
  }

  // --- Step 1: Check if Individual Sale is allowed and active ---
  const allowIndividual = category ? (category.allowIndividualProductSales ?? true) : true;

  if (allowIndividual && product.promo && today && product.promo.isActive && typeof product.promo.value === 'number' && product.promo.value > 0) {
    const promoStart = convertToDateSafely(product.promo.startDate);
    const promoEnd = convertToDateSafely(product.promo.endDate);

    const isProductPromoActive = (!promoStart || today >= promoStart) && (!promoEnd || today <= promoEnd);

    if (isProductPromoActive) {
      const pVal = product.promo.value;
      if (product.promo.type === 'percentage') {
        return baseSellingPrice * (1 - Math.min(pVal, 100) / 100);
      } else if (product.promo.type === 'fixed') {
        return Math.max(0, baseSellingPrice - pVal);
      }
    }
  }

  // --- Step 2: Check if Category Global Flash Sale is ON and active ---
  if (category?.isFlashSale && today) {
    const catStart = convertToDateSafely(category.flashSaleStartDate);
    const catEnd = convertToDateSafely(category.flashSaleEndDate);
    const isGlobalActive = (!catStart || today >= catStart) && (!catEnd || today <= catEnd);

    if (isGlobalActive && (category.flashSaleDiscountValue || 0) > 0) {
      const val = category.flashSaleDiscountValue!;
      if (category.flashSaleDiscountType === 'percentage') {
        return baseSellingPrice * (1 - Math.min(val, 100) / 100);
      } else {
        return Math.max(0, baseSellingPrice - val);
      }
    }
  }

  return baseSellingPrice;
};
