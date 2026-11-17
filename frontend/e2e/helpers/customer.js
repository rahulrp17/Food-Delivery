import { sendCheckoutCompleted } from "./webhook.js";

const API_URL = process.env.API_URL || "http://localhost:4000";
const ORIGIN = "http://localhost:5173";
const PASSWORD = "Test12345";

/**
 * Registers a customer through the public API and returns their account.
 *
 * The customer is created in an isolated browser context so the admin session
 * and the customer session never share a cookie jar.
 */
export async function registerCustomer(context, overrides = {}) {
  const stamp = Date.now().toString().slice(-8);
  const customer = {
    name: overrides.name || `E2E Customer ${stamp}`,
    email: overrides.email || `e2e+customer${stamp}@foodie.test`,
    password: overrides.password || PASSWORD,
  };

  const api = context.request;
  await api.get(`${API_URL}/api/v1/auth/csrf`);

  const response = await api.post(`${API_URL}/api/v1/auth/register`, {
    headers: await csrfHeaders(context),
    data: { name: customer.name, email: customer.email, password: customer.password },
  });

  if (!response.ok()) {
    throw new Error(
      `Customer registration failed (${response.status()}): ${await response.text()}`
    );
  }

  const body = await response.json();
  return { ...customer, id: body.data.user.id };
}

export async function addFirstProductToCart(context, { quantity = 1, minPricePaise = 0 } = {}) {
  const api = context.request;
  const headers = await csrfHeaders(context);

  const productsResponse = await api.get(`${API_URL}/api/v1/products?limit=20`);
  const products = (await productsResponse.json()).data.items;
  const product = products.find(
    (item) =>
      item.isOrderable && (item.stock ?? 0) >= quantity && (item.pricePaise ?? 0) >= minPricePaise
  );

  if (!product) {
    throw new Error("No product with enough stock is available for the E2E order");
  }

  const cartResponse = await api.post(`${API_URL}/api/v1/cart/items`, {
    headers,
    data: { productId: product.id, quantity },
  });

  if (!cartResponse.ok()) {
    throw new Error(`Adding to the cart failed (${cartResponse.status()})`);
  }

  return product;
}

/** Applies a coupon to the signed-in customer's cart and returns the raw response. */
export function applyCouponToCart(context, code) {
  return csrfHeaders(context).then((headers) =>
    context.request.post(`${API_URL}/api/v1/cart/coupon`, { headers, data: { code } })
  );
}

/**
 * Adds an order to a customer account and confirms the payment with a
 * simulated Stripe webhook, so the admin directory has a paid order to report.
 * Pass `couponCode` to redeem a coupon on the order.
 */
export async function placePaidOrder(
  context,
  customer,
  { webhookSecret, quantity = 2, couponCode, minPricePaise = 0 } = {}
) {
  const api = context.request;
  const headers = await csrfHeaders(context);
  const product = await addFirstProductToCart(context, { quantity, minPricePaise });

  if (couponCode) {
    const couponResponse = await applyCouponToCart(context, couponCode);

    if (!couponResponse.ok()) {
      throw new Error(
        `Applying the coupon failed (${couponResponse.status()}): ${await couponResponse.text()}`
      );
    }
  }

  const addressResponse = await api.post(`${API_URL}/api/v1/users/me/addresses`, {
    headers,
    data: {
      recipientName: customer.name,
      phone: "9876543210",
      line1: "42 Test Kitchen Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
    },
  });

  if (!addressResponse.ok()) {
    throw new Error(
      `Saving the address failed (${addressResponse.status()}): ${await addressResponse.text()}`
    );
  }

  const address = (await addressResponse.json()).data.address;

  const orderResponse = await api.post(`${API_URL}/api/v1/orders`, {
    headers,
    data: { addressId: address.id, idempotencyKey: `e2e-${Date.now()}-${customer.id}` },
  });

  if (!orderResponse.ok()) {
    throw new Error(
      `Placing the order failed (${orderResponse.status()}): ${await orderResponse.text()}`
    );
  }

  const order = (await orderResponse.json()).data.order;

  await sendCheckoutCompleted({
    apiUrl: API_URL,
    sessionId: `cs_e2e_${Date.now()}`,
    orderId: order.id,
    webhookSecret,
  });

  return { order, product };
}

/** The CSRF token is double submitted: the cookie value travels in a header. */
export async function csrfHeaders(context) {
  const cookies = await context.cookies();
  const csrf = cookies.find((cookie) => cookie.name === "fd_csrf")?.value || "";

  return { "x-csrf-token": csrf, origin: ORIGIN };
}

export { API_URL, PASSWORD };

