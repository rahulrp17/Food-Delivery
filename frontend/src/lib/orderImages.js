/**
 * Older order snapshots stored upload-style filenames such as
 * `/images/1750471348761food_14.png`. Those files are gone, but the seeded
 * menu image for the same dish still exists, so map the snapshot onto the
 * canonical `/images/food_N.webp` path.
 */
const LEGACY_MENU_IMAGE = /\/images\/(?:\d+)?food_(\d+)\.[a-z]+$/i;

export const resolveOrderImage = (value) => {
  if (!value) return "";
  const url = String(value).trim();
  const match = url.match(LEGACY_MENU_IMAGE);
  if (match) return `/images/food_${match[1]}.webp`;
  return url;
};
