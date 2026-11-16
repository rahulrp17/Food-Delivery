const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPreciseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatINR = (paise) => {
  const amount = Number(paise) / 100;

  if (!Number.isFinite(amount)) return "₹0";

  return amount % 1 === 0
    ? inrFormatter.format(amount)
    : inrPreciseFormatter.format(amount);
};

export const formatRating = (value) => {
  const rating = Number(value);
  return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null;
};

export const formatCount = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count)) return "0";
  return new Intl.NumberFormat("en-IN", { notation: "compact" }).format(count);
};

export const pluralize = (count, singular, plural = `${singular}s`) =>
  Number(count) === 1 ? singular : plural;

export const deliveryWindow = (prepTimeMinutes) => {
  const prep = Number(prepTimeMinutes) || 25;
  return `${prep}-${prep + 8} min`;
};

export const formatShortDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
