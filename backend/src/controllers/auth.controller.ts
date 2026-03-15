import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import Member from "../models/member.model";
import { AuthRequest } from "../middlewares/auth.middleware";

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: 30 * 24 * 60 * 60, // 30 days in seconds
  });
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, username } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const finalUsername = username || email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const usernameExists = await User.findOne({ username: finalUsername });
    const actualUsername = usernameExists ? `${finalUsername}${Math.floor(Math.random() * 1000)}` : finalUsername;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ name, username: actualUsername, email, passwordHash });

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      token: generateToken(user._id.toString()),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      res.json({
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req: any, res: Response) => {
  res.json(req.user);
};

export const logoutUser = async (_req: Request, res: Response) => {
  // For a stateless JWT system, logout is client-side (delete token).
  // If using httpOnly cookies, clear them here.
  res.status(200).json({ message: "Logged out successfully" });
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as { id: string };

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Issue a fresh token
    const newToken = generateToken(user._id.toString());
    res.json({ token: newToken });
  } catch (error: any) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body.name) user.name = req.body.name;
    if (req.body.username) user.username = req.body.username;
    if (req.body.email) user.email = req.body.email;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      token: generateToken(user._id.toString()), // Return fresh token in case email changed
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Cascade: Remove all member relationships where this user is active
    await Member.deleteMany({ userId });

    await user.deleteOne();

    res.status(200).json({ message: "Account deleted permanently" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
