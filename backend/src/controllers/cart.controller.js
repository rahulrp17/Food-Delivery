import asyncHandler from "../utils/asyncHandler.js";
import { ensureCsrfToken } from "../utils/cookies.js";
import {
  addCartItem,
  applyCoupon,
  clearCart,
  getCart,
  mergeGuestCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from "../services/cart.service.js";

export const getCartController = asyncHandler(async (req, res) => {
  ensureCsrfToken(req, res);
  const cart = await getCart(req.cartOwner);
  res.json({ data: cart });
});

export const addCartItemController = asyncHandler(async (req, res) => {
  const cart = await addCartItem(req.cartOwner, req.body);
  res.status(201).json({ data: cart });
});

export const updateCartItemController = asyncHandler(async (req, res) => {
  const cart = await updateCartItem(req.cartOwner, req.params.productId, req.body.quantity);
  res.json({ data: cart });
});

export const removeCartItemController = asyncHandler(async (req, res) => {
  const cart = await removeCartItem(req.cartOwner, req.params.productId);
  res.json({ data: cart });
});

export const clearCartController = asyncHandler(async (req, res) => {
  const cart = await clearCart(req.cartOwner);
  res.json({ data: cart });
});

export const mergeCartController = asyncHandler(async (req, res) => {
  const cart = await mergeGuestCart(req.user._id, req.body.guestToken);
  res.json({ data: cart });
});

export const applyCouponController = asyncHandler(async (req, res) => {
  const cart = await applyCoupon(req.cartOwner, req.body.code);
  res.json({ data: cart });
});

export const removeCouponController = asyncHandler(async (req, res) => {
  const cart = await removeCoupon(req.cartOwner);
  res.json({ data: cart });
});
