import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/user.model";

export interface AuthRequest extends Request {
  user?: IUser;
  workspaceId?: string;
  file?: Express.Multer.File;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback_secret"
      ) as { id: string };

      const user = await User.findById(decoded.id).select("-passwordHash");

      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      req.user = user;

      req.workspaceId =
        (req.headers["x-workspace-id"] as string) ||
        (req.query.workspaceId as string);

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};