import { randomUUID } from "node:crypto";

const HEADER = "x-request-id";
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

export const requestId = (req, res, next) => {
  const incoming = req.headers[HEADER];
  const id = typeof incoming === "string" && SAFE_ID.test(incoming) ? incoming : randomUUID();

  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};

export default requestId;
