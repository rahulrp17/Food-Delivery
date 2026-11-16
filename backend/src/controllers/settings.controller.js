import asyncHandler from "../utils/asyncHandler.js";
import env from "../config/env.js";
import {
  getStoreSettings,
  updateStoreSettings,
} from "../services/settings.service.js";

const buildPaymentInfo = (settings) => ({
  provider: "stripe",
  label: "Stripe",
  configured: Boolean(env.STRIPE_SECRET_KEY),
  webhookConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET),
  mode: String(env.STRIPE_SECRET_KEY || "").startsWith("sk_live") ? "live" : "test",
  currency: settings.currency,
});

export const adminGetSettings = asyncHandler(async (req, res) => {
  const settings = await getStoreSettings();
  res.json({ data: { settings, payments: buildPaymentInfo(settings) } });
});

export const adminUpdateSettings = asyncHandler(async (req, res) => {
  const settings = await updateStoreSettings(req.body);
  res.json({ data: { settings, payments: buildPaymentInfo(settings) } });
});
