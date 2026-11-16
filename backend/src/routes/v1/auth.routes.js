import { Router } from "express";
import { authLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sessionParamsSchema,
  verifyEmailSchema,
} from "../../validators/auth.schema.js";
import { updateProfileSchema } from "../../validators/user.schema.js";
import {
  deleteSession,
  getCsrfToken,
  getSessions,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  updateMyProfile,
  updatePassword,
  verifyEmail,
} from "../../controllers/auth.controller.js";

const authRouter = Router();

authRouter.get("/csrf", getCsrfToken);

authRouter.post("/register", authLimiter, validate({ body: registerSchema }), register);
authRouter.post("/login", authLimiter, validate({ body: loginSchema }), login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);

authRouter.get("/me", authenticate, me);
authRouter.patch(
  "/profile",
  authenticate,
  validate({ body: updateProfileSchema }),
  updateMyProfile
);
authRouter.get("/sessions", authenticate, getSessions);
authRouter.delete(
  "/sessions/:id",
  authenticate,
  validate({ params: sessionParamsSchema }),
  deleteSession
);
authRouter.post("/logout-all", authenticate, logoutAll);
authRouter.patch(
  "/password",
  authenticate,
  validate({ body: changePasswordSchema }),
  updatePassword
);

authRouter.post(
  "/forgot-password",
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  requestPasswordReset
);
authRouter.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  resetPassword
);
authRouter.post("/verify-email", validate({ body: verifyEmailSchema }), verifyEmail);
authRouter.post("/resend-verification", authenticate, resendVerification);

export default authRouter;
