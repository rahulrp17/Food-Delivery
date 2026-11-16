import { z } from "zod";
import { objectIdSchema } from "./auth.schema.js";

export const checkoutSchema = z.object({ orderId: objectIdSchema }).strict();

export const checkoutSessionParamsSchema = z
  .object({ sessionId: z.string().trim().min(10).max(200) })
  .strict();
