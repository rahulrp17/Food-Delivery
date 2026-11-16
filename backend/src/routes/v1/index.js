import { Router } from "express";
import adminRouter from "./admin.routes.js";
import authRouter from "./auth.routes.js";
import cartRouter from "./cart.routes.js";
import catalogRouter from "./catalog.routes.js";
import orderRouter from "./order.routes.js";
import paymentRouter from "./payment.routes.js";
import reviewRouter from "./review.routes.js";
import userRouter from "./user.routes.js";

const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/users", userRouter);
v1Router.use("/cart", cartRouter);
v1Router.use("/orders", orderRouter);
v1Router.use("/payments", paymentRouter);
v1Router.use("/reviews", reviewRouter);
v1Router.use("/admin", adminRouter);
v1Router.use("/", catalogRouter);

export default v1Router;
