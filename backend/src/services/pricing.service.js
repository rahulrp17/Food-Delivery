import { percentOf, roundHalfUp } from "../utils/money.js";

const categoryKey = (value) => (value ? String(value) : "");

export const computeCouponDiscount = (coupon, eligibleSubtotalPaise) => {
  if (!coupon || eligibleSubtotalPaise <= 0) return 0;

  let discount =
    coupon.type === "percent"
      ? percentOf(eligibleSubtotalPaise, coupon.percentBps)
      : Math.min(coupon.amountPaise, eligibleSubtotalPaise);

  if (coupon.maxDiscountPaise !== null && coupon.maxDiscountPaise !== undefined) {
    discount = Math.min(discount, coupon.maxDiscountPaise);
  }

  return Math.max(0, Math.min(discount, eligibleSubtotalPaise));
};

export const calculatePricing = ({ items, coupon = null, settings }) => {
  const subtotalPaise = items.reduce(
    (total, item) => total + item.unitPricePaise * item.quantity,
    0
  );

  const eligibleCategories = (coupon?.applicableCategoryIds || []).map(categoryKey);
  const eligibleSubtotalPaise =
    eligibleCategories.length > 0
      ? items.reduce(
          (total, item) =>
            eligibleCategories.includes(categoryKey(item.categoryId))
              ? total + item.unitPricePaise * item.quantity
              : total,
          0
        )
      : subtotalPaise;

  const discountPaise = computeCouponDiscount(coupon, eligibleSubtotalPaise);
  const taxableBasePaise = subtotalPaise - discountPaise;
  const taxPaise = roundHalfUp((taxableBasePaise * settings.taxRateBps) / 10000);
  const deliveryFeePaise =
    taxableBasePaise >= settings.freeDeliveryThresholdPaise
      ? 0
      : settings.deliveryFeePaise;
  const totalPaise = taxableBasePaise + taxPaise + deliveryFeePaise;

  return {
    subtotalPaise,
    discountPaise,
    deliveryFeePaise,
    taxPaise,
    totalPaise,
    currency: "INR",
    taxRateBps: settings.taxRateBps,
    freeDeliveryThresholdPaise: settings.freeDeliveryThresholdPaise,
  };
};
