import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import ApiError from "../utils/apiError.js";

const toSafeUser = (user) => {
  const plain = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete plain.password;
  delete plain.passwordHash;
  delete plain.tokenVersion;
  delete plain.__v;
  return plain;
};

const createToken = (_id, role) =>
  jwt.sign({ id: _id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || "7d",
  });

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !validator.isEmail(String(email))) {
      return next(ApiError.badRequest("A valid email is required"));
    }
    if (!password) {
      return next(ApiError.badRequest("Password is required"));
    }

    const user = await userModel
      .findOne({ email: String(email).toLowerCase() })
      .select("+password +passwordHash");
    if (!user) {
      return next(ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS"));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash || user.password);
    if (!isMatch) {
      return next(ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS"));
    }

    const token = createToken(user._id, user.role);

    res.status(200).json({
      message: "Login successful",
      success: true,
      user: toSafeUser(user),
      token,
    });
  } catch (error) {
    next(error);
  }
};

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || String(name).trim().length < 2) {
      return next(ApiError.badRequest("Name must be at least 2 characters"));
    }
    if (!email || !validator.isEmail(String(email))) {
      return next(ApiError.badRequest("A valid email is required"));
    }
    if (!password || String(password).length < 8) {
      return next(ApiError.badRequest("Password must be at least 8 characters"));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await userModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(ApiError.conflict("An account with this email already exists"));
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new userModel({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: hashedPassword,
      role: "user",
    });

    const savedUser = await newUser.save();
    const token = createToken(savedUser._id, savedUser.role);

    res.status(201).json({
      message: "User registered successfully",
      success: true,
      user: toSafeUser(savedUser),
      token,
    });
  } catch (error) {
    next(error);
  }
};

export { loginUser, registerUser };
