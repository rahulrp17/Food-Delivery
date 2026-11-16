/**
 * HTTP caching for the public catalog.
 *
 * The menu, the category list and a dish page are read far more often than
 * they change, and every one of them is public. Sending a strong ETag and a
 * short `stale-while-revalidate` window lets the browser and any proxy answer
 * repeat visits from cache instead of hitting MongoDB, and lets a
 * conditional request come back as a cheap `304` with no body.
 */

const DEFAULT_MAX_AGE = 60;
const DEFAULT_STALE_WHILE_REVALIDATE = 300;

const etagFor = (payload) => {
  const json = JSON.stringify(payload);
  let hash = 0;

  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 31 + json.charCodeAt(index)) | 0;
  }

  return `W/"${(hash >>> 0).toString(16)}-${json.length}"`;
};

/**
 * Sends a cached response when the client already has the current version.
 *
 * @param {object} req express request
 * @param {object} res express response
 * @param {*} payload the response body
 * @param {object} [options]
 * @param {number} [options.maxAge] seconds the response may be reused
 * @param {number} [options.staleWhileRevalidate] seconds it may be reused
 *   while a fresh copy is fetched
 * @param {boolean} [options.private] use a private cache (for responses
 *   that vary per signed-in customer)
 */
export const sendCached = (
  req,
  res,
  payload,
  { maxAge = DEFAULT_MAX_AGE, staleWhileRevalidate = DEFAULT_STALE_WHILE_REVALIDATE, private: isPrivate = false } = {}
) => {
  const etag = etagFor(payload);

  res.set("ETag", etag);
  res.set(
    "Cache-Control",
    `${isPrivate ? "private" : "public"}, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );

  // The CORS middleware adds `Vary: Origin`, and a browser will not reuse a
  // cached response that varies by a header the request did not carry. This
  // response is public and identical for every origin, so the origin
  // variation is dropped — leaving `Vary: Accept-Encoding` so a compressed
  // and an uncompressed copy are still told apart.
  if (!isPrivate) {
    res.set("Vary", "Accept-Encoding");
  }

  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }

  res.json({ data: payload });
};

export default sendCached;
