import http from "./client";

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

export const getCategories = (options = {}) =>
  http.get("/categories", options).then((data) => data?.categories || []);

export const getProducts = (params = {}, options = {}) =>
  http
    .get("/products", { ...options, params: cleanParams(params) })
    .then((data) => data || { items: [], meta: { total: 0, totalPages: 0, page: 1 } });

export const getSearchResults = (params = {}, options = {}) =>
  http
    .get("/search", { ...options, params: cleanParams(params) })
    .then((data) => data || { items: [], meta: { total: 0, totalPages: 0, page: 1 } });

export const getProduct = (slug, options = {}) =>
  http.get(`/products/${encodeURIComponent(slug)}`, options).then((data) => data);

export const getRelatedProducts = (slug, limit = 8, options = {}) =>
  http
    .get(`/products/${encodeURIComponent(slug)}/related`, {
      ...options,
      params: { limit },
    })
    .then((data) => data?.items || []);
