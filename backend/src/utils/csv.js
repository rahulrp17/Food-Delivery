const escapeCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  const isPlainNumber = /^-?\d+(?:\.\d+)?$/.test(text);
  const guarded = !isPlainNumber && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
};

export const toCsv = (headers, rows) =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";

export const formatInrCsv = (paise) => {
  const amount = Number(paise);
  return Number.isFinite(amount) ? (amount / 100).toFixed(2) : "0.00";
};

export const formatDateCsv = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
};
