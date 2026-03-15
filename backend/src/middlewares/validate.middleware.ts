import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Generic request validation middleware using Zod schemas.
 * Usage: router.post('/', validate(mySchema), myController);
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ success: false, errors });
    }
    // Replace body with parsed (and potentially transformed) data
    req.body = result.data;
    next();
  };
};
