export const percentOf = (paise, basisPoints) =>
  Math.floor((paise * basisPoints) / 10000);

export const roundHalfUp = (value) => Math.floor(value + 0.5);

export const formatINR = (paise) => `INR ${(paise / 100).toFixed(2)}`;

export const formatINRCompact = (paise) => `INR ${Math.round(paise / 100)}`;

export const toWholeRupees = (paise) => Math.round(paise) / 100;
