import Setting from "../models/setting.model.js";
import ApiError from "../utils/apiError.js";

const ALL_DAY = (day) => ({
  day,
  open: "00:00",
  close: "23:59",
  closed: false,
});

export const DEFAULT_BUSINESS_HOURS = Object.freeze(
  Array.from({ length: 7 }, (_, day) => Object.freeze(ALL_DAY(day)))
);

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  orderNew: true,
  lowStock: true,
  reviewNew: true,
});

export const DEFAULT_STORE_SETTINGS = Object.freeze({
  name: "Foodie",
  supportEmail: "support@foodie.local",
  supportPhone: "",
  currency: "INR",
  deliveryFeePaise: 3900,
  freeDeliveryThresholdPaise: 49900,
  taxRateBps: 500,
  taxLabel: "GST",
  minOrderPaise: 0,
  deliveryEstimateMinutes: { min: 28, max: 34 },
  serviceablePincodes: [],
  businessHours: DEFAULT_BUSINESS_HOURS,
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  invoiceLegalName: "",
  invoiceGstin: "",
  invoiceAddress: "",
  invoiceFooter: "Thank you for ordering with Foodie.",
  isAcceptingOrders: true,
});

const mergeBusinessHours = (hours) => {
  if (!Array.isArray(hours) || hours.length !== 7) {
    return DEFAULT_BUSINESS_HOURS.map((day) => ({ ...day }));
  }

  return DEFAULT_BUSINESS_HOURS.map((fallback) => {
    const match = hours.find((entry) => entry?.day === fallback.day);
    return match
      ? { ...fallback, ...match }
      : { ...fallback };
  });
};

export const getStoreSettings = async () => {
  const doc = await Setting.findOneAndUpdate(
    { key: "store" },
    { $setOnInsert: { key: "store", value: { ...DEFAULT_STORE_SETTINGS } } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    ...DEFAULT_STORE_SETTINGS,
    ...(doc.value || {}),
    deliveryEstimateMinutes: {
      ...DEFAULT_STORE_SETTINGS.deliveryEstimateMinutes,
      ...(doc.value?.deliveryEstimateMinutes || {}),
    },
    notifications: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(doc.value?.notifications || {}),
    },
    businessHours: mergeBusinessHours(doc.value?.businessHours),
  };
};

export const updateStoreSettings = async (patch) => {
  const current = await getStoreSettings();
  const next = {
    ...current,
    ...patch,
    deliveryEstimateMinutes: {
      ...current.deliveryEstimateMinutes,
      ...(patch.deliveryEstimateMinutes || {}),
    },
    notifications: {
      ...current.notifications,
      ...(patch.notifications || {}),
    },
    businessHours: patch.businessHours
      ? mergeBusinessHours(patch.businessHours)
      : current.businessHours,
  };

  await Setting.updateOne({ key: "store" }, { $set: { value: next } }, { upsert: true });

  return next;
};

const timeToMinutes = (value) => {
  const [hours, minutes] = String(value || "0:0").split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
};

export const isStoreOpenAt = (businessHours, date = new Date()) => {
  const hours = mergeBusinessHours(businessHours);
  const entry = hours.find((item) => item.day === date.getDay());

  if (!entry || entry.closed) return false;

  const now = date.getHours() * 60 + date.getMinutes();
  const open = timeToMinutes(entry.open);
  const close = timeToMinutes(entry.close);

  return now >= open && now <= close;
};

export const assertStoreOpen = (settings, date = new Date()) => {
  if (!settings.isAcceptingOrders) {
    throw ApiError.conflict("We are not accepting orders right now", "ORDERS_PAUSED");
  }

  if (!isStoreOpenAt(settings.businessHours, date)) {
    throw ApiError.conflict(
      "The restaurant is closed right now. Please order during business hours.",
      "STORE_CLOSED"
    );
  }
};

const notificationCategoryForType = (type) => {
  if (String(type).startsWith("order.")) return "orderNew";
  if (String(type).startsWith("inventory.")) return "lowStock";
  if (String(type).startsWith("review.")) return "reviewNew";
  return null;
};

export const areNotificationsEnabled = async (type) => {
  const category = notificationCategoryForType(type);
  if (!category) return true;

  const doc = await Setting.findOne({ key: "store" }).lean();
  const preferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(doc?.value?.notifications || {}),
  };

  return preferences[category] !== false;
};
