import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload | any;
      workspaceId?: string;
    }
  }
}

export {};