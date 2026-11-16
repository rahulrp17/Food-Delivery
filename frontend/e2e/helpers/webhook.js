import crypto from "node:crypto";

export function signStripePayload(secret, payload, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  return `t=${timestamp},v1=${signature}`;
}

export async function sendCheckoutCompleted({
  apiUrl,
  sessionId,
  orderId,
  webhookSecret,
}) {
  const event = {
    id: `evt_e2e_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        status: "complete",
        payment_status: "paid",
        payment_intent: `pi_e2e_${Date.now()}`,
        payment_method_types: ["card"],
        metadata: { orderId },
      },
    },
  };

  const payload = JSON.stringify(event);
  const response = await fetch(`${apiUrl}/api/v1/payments/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signStripePayload(webhookSecret, payload),
    },
    body: payload,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Stripe webhook simulation failed (${response.status}): ${JSON.stringify(body)}`
    );
  }

  return body;
}
