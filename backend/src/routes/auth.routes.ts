import express from "express";
import rateLimit from "express-rate-limit";
import { registerUser, loginUser, getMe, logoutUser, refreshToken, updateProfile, deleteAccount } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { registerSchema, loginSchema, updateProfileSchema } from "../validators/auth.validator";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // restrict auth harder
  message: { message: "Too many login attempts, please try again later." }
});

router.post("/register", limiter, validate(registerSchema), registerUser);
router.post("/login", limiter, validate(loginSchema), loginUser);
router.post("/logout", logoutUser);
router.post("/refresh", refreshToken);
router.get("/me", protect, getMe);
router.put("/profile", protect, validate(updateProfileSchema), updateProfile);
router.delete("/me", protect, deleteAccount);

export default router;
