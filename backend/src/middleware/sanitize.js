const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const sanitizeValue = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeValue);

  if (isPlainObject(value)) {
    const clean = {};
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      clean[key] = sanitizeValue(child);
    }
    return clean;
  }

  return value;
};

export const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }

  if (req.params && typeof req.params === "object") {
    Object.defineProperty(req, "params", {
      value: sanitizeValue(req.params),
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  if (req.query && typeof req.query === "object") {
    Object.defineProperty(req, "query", {
      value: sanitizeValue({ ...req.query }),
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  next();
};

export default sanitizeInput;
