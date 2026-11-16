import ApiError from "../utils/apiError.js";

export const validate = (schemas = {}) => (req, res, next) => {
  const details = [];

  for (const source of ["params", "query", "body"]) {
    const schema = schemas[source];
    if (!schema) continue;

    const result = schema.safeParse(req[source]);
    if (!result.success) {
      for (const issue of result.error.issues) {
        details.push({
          source,
          field: issue.path.join(".") || source,
          message: issue.message,
        });
      }
      continue;
    }

    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  if (details.length > 0) {
    return next(ApiError.badRequest("Validation failed", details));
  }

  next();
};

export default validate;
