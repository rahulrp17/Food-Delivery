import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import ApiError from "../utils/apiError.js";
import { ERROR_CODES } from "../config/constants.js";
import { toProductListItem } from "./catalog.service.js";
import { calculatePricing } from "./pricing.service.js";
import { validateCouponForCart } from "./coupon.service.js";
import { getStoreSettings } from "./settings.service.js";

const MAX_ITEM_QUANTITY = 10;

const ownerFilter = (owner) =>
  owner.userId ? { userId: owner.userId } : { guestToken: owner.guestToken };

const emptyPricing = (settings) => ({
  subtotalPaise: 0,
  discountPaise: 0,
  deliveryFeePaise: 0,
  taxPaise: 0,
  totalPaise: 0,
  currency: "INR",
  taxRateBps: settings.taxRateBps,
  freeDeliveryThresholdPaise: settings.freeDeliveryThresholdPaise,
});

const buildLines = async (cart) => {
  const entries = cart?.items || [];
  if (entries.length === 0) return [];

  const products = await Product.find({
    _id: { $in: entries.map((entry) => entry.productId) },
    deletedAt: null,
  }).populate("categoryId", "name slug");

  const productMap = new Map(products.map((product) => [String(product._id), product]));

  return entries.map((entry) => {
    const product = productMap.get(String(entry.productId));

    if (!product) {
      return {
        productId: String(entry.productId),
        slug: "",
        name: "Unavailable item",
        imageUrl: "",
        unitPricePaise: 0,
        quantity: entry.quantity,
        lineTotalPaise: 0,
        stock: 0,
        isAvailable: false,
        maxQuantity: 0,
        categoryId: null,
        quantityExceedsStock: true,
      };
    }

    const item = toProductListItem(product);
    const stock = Math.max(0, item.stock || 0);
    const maxQuantity = Math.min(MAX_ITEM_QUANTITY, stock);

    return {
      productId: item.id,
      slug: item.slug,
      name: item.name,
      imageUrl: item.image?.url || "",
      unitPricePaise: item.pricePaise,
      quantity: entry.quantity,
      lineTotalPaise: item.pricePaise * entry.quantity,
      stock,
      isAvailable: item.isAvailable && stock > 0,
      maxQuantity,
      categoryId: product.categoryId?._id ? String(product.categoryId._id) : null,
      quantityExceedsStock: entry.quantity > stock,
    };
  });
};

const buildResponse = async (cart, owner, settings) => {
  const lines = await buildLines(cart);

  const couponCode = cart?.couponCode || "";
  let couponDoc = null;
  let couponInfo = null;

  if (couponCode && lines.length > 0) {
    const subtotalPaise = lines.reduce((total, line) => total + line.lineTotalPaise, 0);

    try {
      couponDoc = await validateCouponForCart({
        code: couponCode,
        subtotalPaise,
        userId: owner.userId,
      });
    } catch (error) {
      couponInfo = { code: couponCode, description: "", discountPaise: 0, valid: false, reason: error.message };
    }
  }

  const pricingLines = lines.filter((line) => line.unitPricePaise > 0);
  const pricing =
    pricingLines.length === 0
      ? emptyPricing(settings)
      : calculatePricing({
          items: pricingLines.map((line) => ({
            unitPricePaise: line.unitPricePaise,
            quantity: line.quantity,
            categoryId: line.categoryId,
          })),
          coupon: couponDoc,
          settings,
        });

  if (couponDoc) {
    couponInfo = {
      code: couponDoc.code,
      description: couponDoc.description,
      discountPaise: pricing.discountPaise,
      valid: true,
    };
  }

  return {
    items: lines,
    pricing,
    coupon: couponInfo,
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    updatedAt: cart?.updatedAt || null,
  };
};

const assertOrderableProduct = (product, quantity) => {
  const item = toProductListItem(product);

  if (!item.isAvailable || item.stock <= 0) {
    throw new ApiError(409, ERROR_CODES.PRODUCT_UNAVAILABLE, "This item is not available");
  }

  const maxQuantity = Math.min(MAX_ITEM_QUANTITY, item.stock);
  if (quantity > maxQuantity) {
    throw new ApiError(
      409,
      ERROR_CODES.OUT_OF_STOCK,
      `Only ${maxQuantity} unit${maxQuantity === 1 ? "" : "s"} available`
    );
  }

  return item;
};

const getProduct = async (productId) => {
  const product = await Product.findOne({ _id: productId, deletedAt: null });
  if (!product) {
    throw new ApiError(409, ERROR_CODES.PRODUCT_UNAVAILABLE, "This item is not available");
  }
  return product;
};

const findOrCreateCart = async (owner) => {
  const filter = ownerFilter(owner);
  let cart = await Cart.findOne(filter);

  if (!cart) {
    cart = await Cart.create({ ...filter, items: [] });
  }

  return cart;
};

export const getCart = async (owner) => {
  const [cart, settings] = await Promise.all([
    Cart.findOne(ownerFilter(owner)),
    getStoreSettings(),
  ]);

  return buildResponse(cart, owner, settings);
};

export const addCartItem = async (owner, { productId, quantity }) => {
  const product = await getProduct(productId);
  const cart = await findOrCreateCart(owner);
  const existing = cart.items.find((item) => String(item.productId) === String(productId));
  const nextQuantity = (existing?.quantity || 0) + quantity;

  assertOrderableProduct(product, nextQuantity);

  if (existing) {
    existing.quantity = nextQuantity;
  } else {
    cart.items.push({ productId, quantity, addedAt: new Date() });
  }

  await cart.save();
  const settings = await getStoreSettings();
  return buildResponse(cart, owner, settings);
};

export const updateCartItem = async (owner, productId, quantity) => {
  const cart = await Cart.findOne(ownerFilter(owner));

  if (!cart) {
    throw ApiError.notFound("Cart is empty");
  }

  const existing = cart.items.find((item) => String(item.productId) === String(productId));

  if (!existing) {
    throw ApiError.notFound("Item is not in the cart");
  }

  if (quantity === 0) {
    cart.items = cart.items.filter((item) => String(item.productId) !== String(productId));
  } else {
    const product = await getProduct(productId);
    assertOrderableProduct(product, quantity);
    existing.quantity = quantity;
  }

  await cart.save();
  const settings = await getStoreSettings();
  return buildResponse(cart, owner, settings);
};

export const removeCartItem = async (owner, productId) => {
  const cart = await Cart.findOne(ownerFilter(owner));

  if (cart) {
    cart.items = cart.items.filter((item) => String(item.productId) !== String(productId));
    await cart.save();
  }

  const settings = await getStoreSettings();
  return buildResponse(cart, owner, settings);
};

export const clearCart = async (owner) => {
  const cart = await Cart.findOne(ownerFilter(owner));

  if (cart) {
    cart.items = [];
    cart.couponCode = "";
    await cart.save();
  }

  const settings = await getStoreSettings();
  return buildResponse(cart, owner, settings);
};

export const applyCoupon = async (owner, code) => {
  const cart = await Cart.findOne(ownerFilter(owner));

  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest("Add items to the cart before applying a coupon");
  }

  const lines = await buildLines(cart);
  const subtotalPaise = lines.reduce((total, line) => total + line.lineTotalPaise, 0);

  const coupon = await validateCouponForCart({ code, subtotalPaise, userId: owner.userId });
  const settings = await getStoreSettings();
  const pricing = calculatePricing({
    items: lines.map((line) => ({
      unitPricePaise: line.unitPricePaise,
      quantity: line.quantity,
      categoryId: line.categoryId,
    })),
    coupon,
    settings,
  });

  if (pricing.discountPaise <= 0) {
    throw new ApiError(400, ERROR_CODES.COUPON_INVALID, "This coupon does not apply to your cart");
  }

  cart.couponCode = String(code).trim().toUpperCase();
  await cart.save();

  return buildResponse(cart, owner, settings);
};

export const removeCoupon = async (owner) => {
  const cart = await Cart.findOne(ownerFilter(owner));

  if (cart) {
    cart.couponCode = "";
    await cart.save();
  }

  const settings = await getStoreSettings();
  return buildResponse(cart, owner, settings);
};

export const mergeGuestCart = async (userId, guestToken) => {
  const guestCart = await Cart.findOne({ guestToken });

  if (!guestCart) {
    return getCart({ userId });
  }

  const userCart = await findOrCreateCart({ userId });
  const guestEntries = guestCart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  const products = await Product.find({
    _id: { $in: guestEntries.map((entry) => entry.productId) },
    deletedAt: null,
  });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  for (const entry of guestEntries) {
    const product = productMap.get(String(entry.productId));
    if (!product) continue;

    const item = toProductListItem(product);
    if (!item.isAvailable || item.stock <= 0) continue;

    const maxQuantity = Math.min(MAX_ITEM_QUANTITY, item.stock);
    const existing = userCart.items.find(
      (cartItem) => String(cartItem.productId) === String(entry.productId)
    );

    if (existing) {
      existing.quantity = Math.min(maxQuantity, existing.quantity + entry.quantity);
    } else {
      userCart.items.push({
        productId: entry.productId,
        quantity: Math.min(maxQuantity, entry.quantity),
        addedAt: new Date(),
      });
    }
  }

  if (!userCart.couponCode && guestCart.couponCode) {
    userCart.couponCode = guestCart.couponCode;
  }

  await userCart.save();
  await Cart.deleteOne({ _id: guestCart._id });

  const settings = await getStoreSettings();
  return buildResponse(userCart, { userId }, settings);
};

export { MAX_ITEM_QUANTITY };
