const ABSOLUTE_URL = /^https?:\/\//i;

export const toImageUrl = (value) => {
  if (!value) return "";
  const image = String(value).trim();
  if (!image) return "";
  if (ABSOLUTE_URL.test(image) || image.startsWith("/")) return image;
  return `/images/${image}`;
};

export const imagePayload = (value) => {
  const url = toImageUrl(value);
  return url ? { url } : null;
};
