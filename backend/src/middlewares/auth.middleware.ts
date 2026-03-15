import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/user.model";

export interface AuthRequest extends Request {
  user?: IUser;
  workspaceId?: string;
  file?: any; // To support multer file uploads in controllers
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as { id: string };

      req.user = await User.findById(decoded.id).select("-passwordHash") || undefined;
      
      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      // Allow workspace isolation by injecting workspaceId query/param/header if present
      req.workspaceId = req.headers["x-workspace-id"] as string || req.query.workspaceId as string;

      return next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
