import http from "./client";

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

export const reviewsApi = {
  listProductReviews: (productId, params = {}) =>
    http
      .get("/reviews", { params: cleanParams({ productId, ...params }) })
      .then((data) => data || { items: [], meta: { total: 0, totalPages: 0, page: 1 } }),

  mine: (params = {}) =>
    http
      .get("/reviews/mine", { params: cleanParams(params) })
      .then((data) => data || { items: [], meta: { total: 0, totalPages: 0, page: 1 } }),

  create: (payload) => http.post("/reviews", payload),
};

export default reviewsApi;
